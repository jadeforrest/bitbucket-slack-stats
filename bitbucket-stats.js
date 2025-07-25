#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');

class BitbucketStatsCollector {
  constructor() {
    this.workspace = process.env.BITBUCKET_WORKSPACE;
    this.email = process.env.BITBUCKET_EMAIL;
    this.apiToken = process.env.BITBUCKET_API_TOKEN;
    
    if (!this.workspace || !this.email || !this.apiToken) {
      console.error('Missing required environment variables:');
      console.error('- BITBUCKET_WORKSPACE');
      console.error('- BITBUCKET_EMAIL');
      console.error('- BITBUCKET_API_TOKEN');
      process.exit(1);
    }

    this.apiClient = axios.create({
      baseURL: 'https://api.bitbucket.org/2.0',
      auth: {
        username: this.email,
        password: this.apiToken
      },
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async testConnection() {
    try {
      const response = await this.apiClient.get(`/repositories/${this.workspace}`, {
        params: { pagelen: 1 }
      });
      console.log(`✓ Connected to workspace: ${this.workspace}`);
      return true;
    } catch (error) {
      console.error(`✗ Failed to connect to workspace: ${this.workspace}`);
      if (error.response) {
        console.error(`Status: ${error.response.status}`);
        console.error(`Message: ${error.response.data?.error?.message || 'Unknown error'}`);
      }
      return false;
    }
  }

  async loadRepositories() {
    const repoListPath = path.join(__dirname, 'repositories.list');
    
    if (!fs.existsSync(repoListPath)) {
      throw new Error('repositories.list file not found');
    }

    const content = fs.readFileSync(repoListPath, 'utf-8');
    return content.trim().split('\n').filter(line => line.trim());
  }

  async fetchPullRequests(repoName) {
    try {
      const response = await this.apiClient.get(
        `/repositories/${this.workspace}/${repoName}/pullrequests`,
        {
          params: {
            state: 'OPEN',
            pagelen: 50
          }
        }
      );
      
      return response.data.values || [];
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.warn(`Repository not found: ${repoName}`);
        return [];
      }
      if (error.response && error.response.status === 400) {
        console.warn(`Bad request for repository ${repoName}: ${error.response.data?.error?.message || 'Invalid request'}`);
        return [];
      }
      console.error(`API Error for ${repoName}:`, error.response?.status, error.response?.data);
      return [];
    }
  }

  calculatePRSize(pr) {
    const additions = pr.additions || 0;
    const deletions = pr.deletions || 0;
    return additions + deletions;
  }

  calculateOpenDays(createdDate) {
    const created = new Date(createdDate);
    const now = new Date();
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  async collectStats() {
    console.log('Collecting Bitbucket PR statistics...\n');
    
    // Test connection first
    const connected = await this.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Bitbucket API');
    }
    
    const repositories = await this.loadRepositories();
    const stats = {
      assigneeStats: {},
      totalPRs: 0,
      repositoryStats: {}
    };

    for (const repo of repositories) {
      console.log(`Processing repository: ${repo}`);
      
      try {
        const pullRequests = await this.fetchPullRequests(repo);
        
        stats.repositoryStats[repo] = {
          openPRs: pullRequests.length,
          prs: []
        };

        for (const pr of pullRequests) {
          const assignee = pr.reviewers && pr.reviewers.length > 0 
            ? pr.reviewers[0].display_name || pr.reviewers[0].username
            : 'Unassigned';
          
          const submitter = pr.author.display_name || pr.author.username;
          const openDays = this.calculateOpenDays(pr.created_on);
          const prSize = this.calculatePRSize(pr);

          // Track assignee stats
          if (!stats.assigneeStats[assignee]) {
            stats.assigneeStats[assignee] = {
              count: 0,
              maxOpenDays: 0,
              totalSize: 0,
              prs: []
            };
          }
          
          stats.assigneeStats[assignee].count++;
          stats.assigneeStats[assignee].maxOpenDays = Math.max(
            stats.assigneeStats[assignee].maxOpenDays, 
            openDays
          );
          stats.assigneeStats[assignee].totalSize += prSize;
          stats.assigneeStats[assignee].prs.push({
            title: pr.title,
            repo: repo,
            openDays: openDays,
            size: prSize,
            url: pr.links.html.href
          });

          stats.repositoryStats[repo].prs.push({
            title: pr.title,
            assignee: assignee,
            submitter: submitter,
            openDays: openDays,
            size: prSize,
            url: pr.links.html.href
          });

          stats.totalPRs++;
        }
      } catch (error) {
        console.error(`Error processing repository ${repo}:`, error.message);
      }
    }

    return stats;
  }

  displayStats(stats) {
    console.log('\n' + '='.repeat(60));
    console.log('BITBUCKET PULL REQUEST STATISTICS');
    console.log('='.repeat(60));
    
    console.log(`\nTotal Open PRs: ${stats.totalPRs}`);
    
    // Assignee Statistics
    console.log('\n📝 PR ASSIGNMENTS:');
    console.log('-'.repeat(40));
    
    const sortedAssignees = Object.entries(stats.assigneeStats)
      .sort(([,a], [,b]) => b.count - a.count);
    
    for (const [assignee, data] of sortedAssignees) {
      const avgSize = data.count > 0 ? Math.round(data.totalSize / data.count) : 0;
      console.log(`${assignee}:`);
      console.log(`  • PRs assigned: ${data.count}`);
      console.log(`  • Max open time: ${data.maxOpenDays} days`);
      console.log(`  • Avg PR size: ${avgSize} lines`);
      console.log('');
    }


    // Repository Statistics
    console.log('\n📁 REPOSITORY BREAKDOWN:');
    console.log('-'.repeat(40));
    
    const sortedRepos = Object.entries(stats.repositoryStats)
      .sort(([,a], [,b]) => b.openPRs - a.openPRs)
      .filter(([,data]) => data.openPRs > 0);
    
    for (const [repo, data] of sortedRepos) {
      console.log(`${repo}: ${data.openPRs} open PRs`);
    }
  }

  async run() {
    try {
      const stats = await this.collectStats();
      this.displayStats(stats);
      
      // Save raw data for potential Slack integration
      const outputFile = 'bitbucket-stats.json';
      fs.writeFileSync(outputFile, JSON.stringify(stats, null, 2));
      console.log(`\n📊 Raw data saved to: ${outputFile}`);
      
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

if (require.main === module) {
  const collector = new BitbucketStatsCollector();
  collector.run();
}

module.exports = BitbucketStatsCollector;
# Bitbucket PR Statistics Collector

A Node.js tool that connects to the Bitbucket API to collect and analyze pull request statistics across multiple repositories. Designed as the first step for integration with Slack notifications.

## Prerequisites

- Node.js 18.0.0 or higher
- Bitbucket workspace access
- Bitbucket App Password or API token

## Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd bitbucket-slack-stats
npm install
```

### 2. Create Bitbucket API Token

1. Go to your Bitbucket account settings
2. Navigate to **App passwords** under **Access management**
3. Click **Create app password**
4. Give it a label (e.g., "PR Stats Collector")
5. Select the following permissions:
   - **Repositories**: Read
   - **Pull requests**: Read
6. Copy the generated token

### 3. Configure Environment Variables

Set the required environment variables:

```bash
export BITBUCKET_WORKSPACE=your_workspace_name
export BITBUCKET_EMAIL=your_email@example.com
export BITBUCKET_API_TOKEN=your_app_password_token
```

Or create a `.env` file (not recommended for production):

```bash
BITBUCKET_WORKSPACE=your_workspace_name
BITBUCKET_EMAIL=your_email@example.com  
BITBUCKET_API_TOKEN=your_app_password_token
```

### 4. Configure Repository List

Edit the `repositories.list` file to include the repositories you want to analyze:

```
repo-name-1
repo-name-2
repo-name-3
```

Each repository name should be on a separate line, matching the exact repository name in Bitbucket.

## Usage

### Run the Statistics Collector

```bash
npm start
```

Or run directly:

```bash
node bitbucket-stats.js
```

### Sample Output

```
Collecting Bitbucket PR statistics...

Processing repository: my-api-app
Processing repository: my-frontend-app

============================================================
BITBUCKET PULL REQUEST STATISTICS
============================================================

Total Open PRs: 15

📝 PR ASSIGNMENTS:
----------------------------------------
John Doe:
  • PRs assigned: 5
  • Max open time: 12 days
  • Avg PR size: 156 lines

Jane Smith:
  • PRs assigned: 3
  • Max open time: 8 days
  • Avg PR size: 89 lines

Unassigned:
  • PRs assigned: 2
  • Max open time: 5 days
  • Avg PR size: 234 lines

👤 PR SUBMITTERS:
----------------------------------------
Alice Johnson:
  • PRs submitted: 4
  • Max open time: 12 days
  • Avg PR size: 145 lines

Bob Wilson:
  • PRs submitted: 3
  • Max open time: 10 days
  • Avg PR size: 98 lines

📁 REPOSITORY BREAKDOWN:
----------------------------------------
my-api-app: 8 open PRs
my-frontend-app: 4 open PRs
legacy-service: 3 open PRs

📊 Raw data saved to: bitbucket-stats.json
```

## Output Files

- **Console Output**: Human-readable statistics summary
- **bitbucket-stats.json**: Raw data in JSON format for programmatic use

### JSON Structure

```json
{
  "assigneeStats": {
    "John Doe": {
      "count": 5,
      "maxOpenDays": 12,
      "totalSize": 780,
      "prs": [...]
    }
  },
  "submitterStats": {
    "Alice Johnson": {
      "count": 4,
      "maxOpenDays": 12,
      "totalSize": 580
    }
  },
  "totalPRs": 15,
  "repositoryStats": {
    "my-api-app": {
      "openPRs": 8,
      "prs": [...]
    }
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BITBUCKET_WORKSPACE` | Your Bitbucket workspace name | ✅ |
| `BITBUCKET_EMAIL` | Your Bitbucket account email | ✅ |
| `BITBUCKET_API_TOKEN` | Your Bitbucket app password | ✅ |

### Repository List

The `repositories.list` file should contain one repository name per line. Repository names must match exactly as they appear in your Bitbucket workspace.

## Troubleshooting

### Common Issues

**Authentication Error**
```
Error: Request failed with status code 401
```
- Verify your email and API token are correct
- Ensure the API token has Repository and Pull Request read permissions

**Repository Not Found**
```
Repository not found: repo-name
```
- Check that the repository name in `repositories.list` matches exactly
- Verify you have access to the repository
- Ensure the repository exists in the specified workspace

**Missing Environment Variables**
```
Missing required environment variables
```
- Make sure all three environment variables are set
- Check for typos in variable names

### Rate Limiting

The Bitbucket API has rate limits. If you encounter rate limiting:
- Reduce the number of repositories being processed
- Add delays between API calls if needed
- Consider running during off-peak hours

## Future Enhancements (Planned)

- **Slack Integration**: Send formatted statistics to Slack channels

## Development

### Project Structure

```
bitbucket-slack-stats/
├── package.json
├── bitbucket-stats.js      # Main application
├── repositories.list       # Repository configuration
├── bitbucket-stats.json   # Generated statistics (after run)
└── README.md
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with your Bitbucket workspace
5. Submit a pull request

## License

MIT License - see LICENSE file for details
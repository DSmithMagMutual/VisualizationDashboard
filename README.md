# Jira Dashboard

A minimalist dashboard for Jira data visualization built with Next.js and Material-UI.

## Features

- **Sprint Progress Tracking**: Monitor sprint completion and velocity
- **Feature Status Overview**: Track feature development progress
- **Team Utilization Metrics**: Monitor team workload and capacity
- **Sprint Velocity Analysis**: Historical sprint performance data
- **Survey & Feedback Integration**: Collect and display team feedback
- **Real-time Data**: Live updates from Jira API
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: Material-UI (MUI) v7
- **Charts**: Recharts
- **Icons**: Lucide React
- **HTTP Client**: Axios
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Jira instance with API access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd VisualizationDashboard
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory with your Jira credentials:

```env
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-api-token
```

**Note**: Remove `/rest/api/3` from the base URL if it's included - the API routes will add this automatically.

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   └── jira/         # Jira API proxy
│   ├── globals.css       # Global styles
│   ├── layout.tsx        # Root layout
│   └── page.tsx          # Main dashboard page
├── components/            # React components
│   ├── dialogs/          # Dialog components
│   ├── widgets/          # Dashboard widgets
│   └── MinimalistDashboard.tsx
├── config/               # Configuration files
├── lib/                  # Utility libraries
└── types/                # TypeScript type definitions
```

## API Routes

The application uses Next.js API routes to proxy Jira API calls, avoiding CORS issues:

- `GET /api/jira?endpoint=board` - Get all boards
- `GET /api/jira?endpoint=board/{id}/sprint` - Get sprints for a board
- `GET /api/jira?endpoint=sprint/{id}/issue` - Get issues for a sprint
- `POST /api/jira?endpoint=...` - Post data to Jira

## Widgets

### Sprint Progress Widget
Displays current sprint completion status with visual progress indicators.

### Feature Status Widget
Shows feature development status across different categories.

### Team Utilization Widget
Tracks team member workload and capacity utilization.

### Sprint Velocity Widget
Historical sprint velocity data with trend analysis.

### Survey Cell
Integration point for team feedback and surveys.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `JIRA_BASE_URL` | Your Jira instance URL | Yes |
| `JIRA_EMAIL` | Your Jira account email | Yes |
| `JIRA_API_TOKEN` | Your Jira API token | Yes |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License. 
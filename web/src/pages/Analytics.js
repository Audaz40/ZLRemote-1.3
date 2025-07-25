import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  BarChart3, 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  Download,
  Calendar,
  Filter
} from 'lucide-react';

const AnalyticsContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
`;

const FilterButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 8px;
  color: ${props => props.theme.colors.text};
  cursor: pointer;
  font-weight: 500;

  &:hover {
    background: ${props => props.theme.colors.surfaceHover};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const StatCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

const StatIcon = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: ${props => props.color}20;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color};
  margin-bottom: 16px;
`;

const StatValue = styled.div`
  font-size: 32px;
  font-weight: 700;
  color: ${props => props.theme.colors.text};
  margin-bottom: 4px;
`;

const StatLabel = styled.div`
  font-size: 14px;
  color: ${props => props.theme.colors.textSecondary};
  margin-bottom: 8px;
`;

const StatChange = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${props => props.positive ? props.theme.colors.success : props.theme.colors.error};
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ChartsGrid = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 32px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
`;

const ChartTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${props => props.theme.colors.text};
  margin-bottom: 20px;
`;

const Chart = styled.div`
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.theme.colors.background};
  border-radius: 8px;
  color: ${props => props.theme.colors.textSecondary};
  font-style: italic;
`;

const TableCard = styled.div`
  background: ${props => props.theme.colors.surface};
  border: 1px solid ${props => props.theme.colors.border};
  border-radius: 16px;
  padding: 24px;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.thead`
  background: ${props => props.theme.colors.background};
`;

const TableRow = styled.tr`
  border-bottom: 1px solid ${props => props.theme.colors.borderLight};

  &:last-child {
    border-bottom: none;
  }
`;

const TableCell = styled.td`
  padding: 12px 16px;
  font-size: 14px;
  color: ${props => props.theme.colors.text};

  &:first-child {
    font-weight: 500;
  }
`;

const TableHeaderCell = styled.th`
  padding: 12px 16px;
  text-align: left;
  font-weight: 600;
  color: ${props => props.theme.colors.textSecondary};
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${props => props.theme.colors.textSecondary};

  h3 {
    font-size: 20px;
    margin-bottom: 8px;
    color: ${props => props.theme.colors.text};
  }

  p {
    margin-bottom: 24px;
    line-height: 1.6;
  }
`;

const Analytics = () => {
  const [timeRange, setTimeRange] = useState('7d');
  const [analytics, setAnalytics] = useState({
    totalSessions: 0,
    totalUsers: 0,
    avgSessionDuration: 0,
    totalBandwidth: 0,
    sessionsToday: 0,
    avgLatency: 0,
    peakUsers: 0,
    uptime: 99.9
  });

  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    // Simulate loading analytics data
    const loadAnalytics = () => {
      setAnalytics({
        totalSessions: 1247,
        totalUsers: 892,
        avgSessionDuration: 25.4,
        totalBandwidth: 2.3,
        sessionsToday: 42,
        avgLatency: 12,
        peakUsers: 156,
        uptime: 99.9
      });

      setRecentSessions([
        { id: 'ABC123', duration: '45m', users: 3, quality: 'High', status: 'Completed' },
        { id: 'DEF456', duration: '1h 20m', users: 1, quality: 'Ultra', status: 'Active' },
        { id: 'GHI789', duration: '22m', users: 5, quality: 'Medium', status: 'Completed' },
        { id: 'JKL012', duration: '38m', users: 2, quality: 'High', status: 'Completed' },
        { id: 'MNO345', duration: '15m', users: 1, quality: 'Low', status: 'Ended' },
      ]);
    };

    loadAnalytics();
  }, [timeRange]);

  const stats = [
    {
      icon: <Users size={24} />,
      color: '#667eea',
      value: analytics.totalSessions,
      label: 'Total Sessions',
      change: '+12%',
      positive: true
    },
    {
      icon: <Activity size={24} />,
      color: '#51cf66',
      value: `${analytics.avgLatency}ms`,
      label: 'Average Latency',
      change: '-8%',
      positive: true
    },
    {
      icon: <Clock size={24} />,
      color: '#ffa502',
      value: `${analytics.avgSessionDuration}m`,
      label: 'Avg Session Duration',
      change: '+5%',
      positive: true
    },
    {
      icon: <TrendingUp size={24} />,
      color: '#ff6b6b',
      value: `${analytics.uptime}%`,
      label: 'Uptime',
      change: '+0.1%',
      positive: true
    }
  ];

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <AnalyticsContainer>
      <Header>
        <Title>Analytics</Title>
        <FilterButton>
          <Calendar size={16} />
          Last 7 days
          <Filter size={16} />
        </FilterButton>
      </Header>

      <StatsGrid>
        {stats.map((stat, index) => (
          <StatCard key={index}>
            <StatIcon color={stat.color}>
              {stat.icon}
            </StatIcon>
            <StatValue>{stat.value}</StatValue>
            <StatLabel>{stat.label}</StatLabel>
            <StatChange positive={stat.positive}>
              <TrendingUp size={12} />
              {stat.change} from last period
            </StatChange>
          </StatCard>
        ))}
      </StatsGrid>

      <ChartsGrid>
        <ChartCard>
          <ChartTitle>Session Activity</ChartTitle>
          <Chart>
            📊 Interactive chart will be implemented here
          </Chart>
        </ChartCard>

        <ChartCard>
          <ChartTitle>Performance Metrics</ChartTitle>
          <Chart>
            📈 Performance chart will be implemented here
          </Chart>
        </ChartCard>
      </ChartsGrid>

      <TableCard>
        <ChartTitle>Recent Sessions</ChartTitle>
        {recentSessions.length === 0 ? (
          <EmptyState>
            <BarChart3 size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
            <h3>No session data</h3>
            <p>Session analytics will appear here once you start hosting or joining sessions.</p>
          </EmptyState>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHeaderCell>Session ID</TableHeaderCell>
                <TableHeaderCell>Duration</TableHeaderCell>
                <TableHeaderCell>Users</TableHeaderCell>
                <TableHeaderCell>Quality</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHeader>
            <tbody>
              {recentSessions.map((session, index) => (
                <TableRow key={index}>
                  <TableCell style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                    {session.id}
                  </TableCell>
                  <TableCell>{session.duration}</TableCell>
                  <TableCell>{session.users}</TableCell>
                  <TableCell>{session.quality}</TableCell>
                  <TableCell>
                    <span style={{ 
                      padding: '4px 8px', 
                      borderRadius: '12px', 
                      fontSize: '11px',
                      fontWeight: '600',
                      background: session.status === 'Active' ? '#51cf6620' : 
                                 session.status === 'Completed' ? '#667eea20' : '#ff6b6b20',
                      color: session.status === 'Active' ? '#51cf66' : 
                             session.status === 'Completed' ? '#667eea' : '#ff6b6b'
                    }}>
                      {session.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </TableCard>
    </AnalyticsContainer>
  );
};

export default Analytics;
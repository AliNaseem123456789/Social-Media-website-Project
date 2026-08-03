// components/PublicDownload.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  LinearProgress,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Alert,
  AlertTitle,
  IconButton,
  Tooltip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Stack,
  Fade,
  Grow,
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Image as ImageIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  FolderZip as ZipIcon,
  Clear as ClearIcon,
  Terminal as TerminalIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  borderRadius: theme.spacing(2),
  background: 'linear-gradient(145deg, #ffffff 0%, #f5f7fa 100%)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
}));

const GradientButton = styled(Button)(({ theme }) => ({
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  padding: '12px 32px',
  fontSize: '1.1rem',
  fontWeight: 600,
  '&:hover': {
    background: 'linear-gradient(135deg, #5a67d8 0%, #6b46a1 100%)',
    boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
  },
  '&:disabled': {
    background: '#c4c4c4',
  },
}));

const LogContainer = styled(Box)(({ theme }) => ({
  background: '#0d1117',
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(2),
  maxHeight: 250,
  overflowY: 'auto',
  fontFamily: 'monospace',
  fontSize: '0.85rem',
  lineHeight: 1.8,
  color: '#e6edf3',
  '&::-webkit-scrollbar': {
    width: 6,
  },
  '&::-webkit-scrollbar-track': {
    background: '#0d1117',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#2d3748',
    borderRadius: 3,
  },
}));

const StatsCard = styled(Card)(({ theme }) => ({
  height: '100%',
  background: 'linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)',
  borderRadius: theme.spacing(2),
  border: '1px solid #e0e0e0',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
  },
}));

const PublicDownload = () => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Ready');
  const [logs, setLogs] = useState([]);
  const [images, setImages] = useState([]);
  const [stats, setStats] = useState(null);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [showStats, setShowStats] = useState(true);

  const logContainerRef = useRef(null);
  const startTimeRef = useRef(null);
  const speedIntervalRef = useRef(null);

  // Auto-scroll log
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
      }
    };
  }, []);

  // Load stats on mount
  useEffect(() => {
    loadStats();
    listImages();
  }, []);

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type, id: Date.now() + Math.random() }]);
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSecond) => {
    if (bytesPerSecond === 0) return '0 B/s';
    return formatBytes(bytesPerSecond) + '/s';
  };

  const loadStats = async () => {
    try {
      const response = await fetch('/api/public/bucket-stats');
      const data = await response.json();
      if (data.success) {
        setStats(data.stats);
        setTotalSize(data.stats.totalSize);
        addLog(`📊 Loaded bucket stats: ${data.stats.imageCount} images`, 'success');
      }
    } catch (err) {
      addLog(`❌ Failed to load stats: ${err.message}`, 'error');
    }
  };

  const listImages = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/public/list-images');
      const data = await response.json();
      if (data.success) {
        setImages(data.images);
        addLog(`📸 Found ${data.totalImages} images in bucket`, 'success');
      }
    } catch (err) {
      addLog(`❌ Failed to list images: ${err.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (isDownloading) return;

    setIsDownloading(true);
    setProgress(0);
    setChunkCount(0);
    setDownloadSpeed(0);
    setBytesReceived(0);
    startTimeRef.current = null;

    addLog('🚀 Starting streaming download...', 'info');
    setStatus('Connecting...');

    try {
      const response = await fetch('/api/public/download-all', {
        method: 'GET',
      });

      addLog(`📡 Status: ${response.status} ${response.statusText}`, 'info');
      
      const transferEncoding = response.headers.get('transfer-encoding');
      addLog(`📡 Transfer-Encoding: ${transferEncoding || 'chunked (default)'}`, 
        transferEncoding === 'chunked' ? 'success' : 'info');

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Download failed');
      }

      const contentDisposition = response.headers.get('content-disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1].replace(/"/g, '')
        : `images_backup_${Date.now()}.zip`;

      addLog(`📁 Filename: ${filename}`, 'info');

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        const total = parseInt(contentLength);
        setTotalSize(total);
        addLog(`📦 ZIP size: ${formatBytes(total)}`, 'info');
      } else {
        addLog('📦 Size: Streaming (chunked)', 'info');
      }

      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;

      addLog('🔄 Receiving stream...', 'info');
      setStatus('Streaming...');

      // Track speed
      speedIntervalRef.current = setInterval(() => {
        if (received > 0 && startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed > 0.5) {
            setDownloadSpeed(received / elapsed);
          }
        }
      }, 1000);

      startTimeRef.current = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          addLog('✅ Stream complete', 'success');
          break;
        }

        chunks.push(value);
        received += value.length;
        setBytesReceived(received);
        setChunkCount(prev => prev + 1);

        if (contentLength) {
          const percent = Math.round((received / parseInt(contentLength)) * 100);
          setProgress(percent);
          setStatus(`Downloading... ${percent}%`);
        } else {
          setStatus(`Streaming... ${chunks.length} chunks (${formatBytes(received)})`);
        }

        if (chunks.length % 10 === 0) {
          addLog(`📦 ${chunks.length} chunks received (${formatBytes(received)})`, 'info');
        }

        // Update speed
        if (startTimeRef.current) {
          const elapsed = (Date.now() - startTimeRef.current) / 1000;
          if (elapsed > 0.5) {
            setDownloadSpeed(received / elapsed);
          }
        }
      }

      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }

      addLog('📝 Creating ZIP file...', 'info');
      const blob = new Blob(chunks, { type: 'application/zip' });
      
      addLog(`📦 Final ZIP size: ${formatBytes(blob.size)}`, 'success');
      setStatus('Creating download...');

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog('✅ Download complete!', 'success');
      setStatus('✅ Complete!');
      setProgress(100);
      setDownloadSpeed(0);

    } catch (err) {
      addLog(`❌ Error: ${err.message}`, 'error');
      setStatus(`❌ ${err.message}`);
      
      if (speedIntervalRef.current) {
        clearInterval(speedIntervalRef.current);
        speedIntervalRef.current = null;
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    addLog('🧹 Log cleared', 'info');
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return '#2ea043';
      case 'error': return '#f85149';
      case 'info': return '#58a6ff';
      default: return '#8b949e';
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
          🐘 Public Image Downloader
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Download all images from Supabase bucket using HTTP streaming with chunked encoding
        </Typography>
      </Box>

      {/* Stats Cards */}
      {stats && showStats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>Images</Typography>
                  <ImageIcon color="primary" />
                </Box>
                <Typography variant="h4">{stats.imageCount}</Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>Total Size</Typography>
                  <StorageIcon color="secondary" />
                </Box>
                <Typography variant="h4">{stats.totalSizeFormatted}</Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>Speed</Typography>
                  <SpeedIcon color="success" />
                </Box>
                <Typography variant="h4">
                  {isDownloading ? formatSpeed(downloadSpeed) : '—'}
                </Typography>
              </CardContent>
            </StatsCard>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatsCard>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Typography color="textSecondary" gutterBottom>Chunks</Typography>
                  <ScheduleIcon color="warning" />
                </Box>
                <Typography variant="h4">{chunkCount}</Typography>
              </CardContent>
            </StatsCard>
          </Grid>
        </Grid>
      )}

      {/* Main Controls */}
      <StyledPaper>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={2} alignItems="center">
          <Box flex={1}>
            <Typography variant="h6" gutterBottom>
              Download All Images
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Creates a ZIP archive on-the-fly and streams it to your browser
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <GradientButton
              variant="contained"
              startIcon={isDownloading ? <CircularProgress size={20} color="inherit" /> : <DownloadIcon />}
              onClick={handleDownload}
              disabled={isDownloading}
            >
              {isDownloading ? 'Downloading...' : 'Download ZIP'}
            </GradientButton>
            <Tooltip title="Refresh stats">
              <IconButton onClick={loadStats} disabled={isDownloading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Toggle stats">
              <IconButton onClick={() => setShowStats(!showStats)} disabled={isDownloading}>
                <StorageIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>

        {/* Progress */}
        {isDownloading && (
          <Fade in={isDownloading}>
            <Box sx={{ mt: 2 }}>
              <Box display="flex" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="textSecondary">{status}</Typography>
                <Typography variant="body2" color="textSecondary">
                  {formatBytes(bytesReceived)} {totalSize > 0 && `/ ${formatBytes(totalSize)}`}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={Math.min(progress, 100)} 
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Fade>
        )}

        {/* Progress Details */}
        {isDownloading && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={3} flexWrap="wrap">
              <Chip 
                icon={<ZipIcon />} 
                label={`Chunks: ${chunkCount}`} 
                size="small" 
                variant="outlined" 
              />
              <Chip 
                icon={<SpeedIcon />} 
                label={`Speed: ${formatSpeed(downloadSpeed)}`} 
                size="small" 
                variant="outlined" 
                color={downloadSpeed > 0 ? 'success' : 'default'}
              />
              <Chip 
                icon={<StorageIcon />} 
                label={`Received: ${formatBytes(bytesReceived)}`} 
                size="small" 
                variant="outlined" 
              />
            </Stack>
          </Box>
        )}

        {/* Status Alert */}
        {status !== 'Ready' && status !== '✅ Complete!' && (
          <Fade in>
            <Alert severity={status.includes('❌') ? 'error' : 'info'} sx={{ mt: 2 }}>
              <AlertTitle>{status}</AlertTitle>
              {isDownloading && 'Streaming data in real-time with chunked encoding'}
            </Alert>
          </Fade>
        )}
      </StyledPaper>

      {/* Image List Preview */}
      <StyledPaper>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <ImageIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Image Preview ({images.length})
          </Typography>
          {isLoading && <CircularProgress size={24} />}
        </Box>
        <Divider sx={{ mb: 2 }} />
        
        {images.length === 0 ? (
          <Typography color="textSecondary" align="center" sx={{ py: 4 }}>
            {isLoading ? 'Loading images...' : 'No images found in bucket'}
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
            {images.slice(0, 20).map((img, idx) => (
              <ListItem key={idx} divider>
                <ListItemIcon>
                  <ImageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={img.name} 
                  secondary={`${formatBytes(img.size)} • ${new Date(img.created).toLocaleDateString()}`}
                  primaryTypographyProps={{ 
                    style: { 
                      whiteSpace: 'nowrap', 
                      overflow: 'hidden', 
                      textOverflow: 'ellipsis' 
                    } 
                  }}
                />
              </ListItem>
            ))}
            {images.length > 20 && (
              <ListItem>
                <ListItemText 
                  primary={`+ ${images.length - 20} more images`} 
                  primaryTypographyProps={{ color: 'textSecondary', align: 'center' }}
                />
              </ListItem>
            )}
          </List>
        )}
      </StyledPaper>

      {/* Live Log */}
      <StyledPaper>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">
            <TerminalIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Live Stream Log
          </Typography>
          <IconButton size="small" onClick={clearLogs}>
            <ClearIcon />
          </IconButton>
        </Box>
        <LogContainer ref={logContainerRef}>
          {logs.length === 0 ? (
            <Box sx={{ color: '#8b949e', textAlign: 'center', py: 2 }}>
              Ready to download. Click "Download ZIP" to start streaming!
            </Box>
          ) : (
            logs.map((log) => (
              <Box key={log.id} sx={{ color: getLogColor(log.type) }}>
                <span style={{ color: '#484f58', marginRight: 12 }}>
                  [{log.timestamp}]
                </span>
                {log.message}
              </Box>
            ))
          )}
        </LogContainer>
      </StyledPaper>

      {/* Info Box */}
      <Grow in>
        <Paper sx={{ p: 3, bgcolor: '#f0f7ff', borderRadius: 2, border: '1px solid #b3d4fc' }}>
          <Typography variant="subtitle2" gutterBottom>
            🌐 How Streaming Works
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#1a1a2e' }}>
                <li>Server creates ZIP <strong>on-the-fly</strong></li>
                <li>Data sent via <strong>Transfer-Encoding: chunked</strong></li>
                <li>Download starts <strong>immediately</strong></li>
                <li>Low memory usage - files streamed directly</li>
              </ul>
            </Grid>
            <Grid item xs={12} md={6}>
              <ul style={{ margin: 0, paddingLeft: 20, color: '#1a1a2e' }}>
                <li>Open <strong>DevTools → Network</strong> to see headers</li>
                <li>Watch <strong>chunks</strong> arrive in real-time</li>
                <li>No authentication required</li>
                <li>All images from <strong>avatars</strong> bucket</li>
              </ul>
            </Grid>
          </Grid>
        </Paper>
      </Grow>
    </Container>
  );
};

export default PublicDownload;
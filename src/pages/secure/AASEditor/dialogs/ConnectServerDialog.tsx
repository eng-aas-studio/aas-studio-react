import { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  CheckCircleRounded,
  CloseRounded,
  CloudDownloadRounded,
  ErrorOutlineRounded,
  LanRounded,
} from '@mui/icons-material';

import { useAASRemote, type RemoteAuth, type RemoteShellSummary } from '@/hooks/useAASRemote';
import { mapEnvironmentToModel } from '@/utils/aas-mapper';
import { useAASContext } from '@/context/AASContext';
import { useCustomSnackbar } from '@/context/SnackbarContext';

type AuthType = 'none' | 'bearer' | 'basic';

interface ConnectServerDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ConnectServerDialog({ open, onClose }: ConnectServerDialogProps) {
  const { ping, listShells, pull } = useAASRemote();
  const { importAas } = useAASContext();
  const { showSnackbar } = useCustomSnackbar();

  const [baseUrl, setBaseUrl] = useState('');
  const [authType, setAuthType] = useState<AuthType>('none');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [pinging, setPinging] = useState(false);
  const [connected, setConnected] = useState(false);
  const [profiles, setProfiles] = useState<string[]>([]);
  const [shells, setShells] = useState<RemoteShellSummary[]>([]);
  const [selectedShell, setSelectedShell] = useState<string>('');
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildAuth = (): RemoteAuth => {
    if (authType === 'bearer') return { type: 'bearer', token };
    if (authType === 'basic') return { type: 'basic', username, password };
    return { type: 'none' };
  };

  const reset = () => {
    setConnected(false);
    setProfiles([]);
    setShells([]);
    setSelectedShell('');
    setError(null);
  };

  const handleClose = () => {
    onClose();
  };

  const handleTest = async () => {
    if (!baseUrl.trim()) return;
    setPinging(true);
    reset();
    try {
      const auth = buildAuth();
      const res = await ping(baseUrl.trim(), auth);
      if (res.status !== 'Success' || !res.data?.reachable) {
        setError(res.message || `Server non raggiungibile${res.data?.statusCode ? ` (HTTP ${res.data.statusCode})` : ''}`);
        return;
      }
      setConnected(true);
      setProfiles(res.data.profiles ?? []);

      const shellsRes = await listShells(baseUrl.trim(), auth);
      if (shellsRes.status === 'Success') {
        const list = shellsRes.data?.shells ?? [];
        setShells(list);
        if (list.length > 0) setSelectedShell(list[0].id);
      } else {
        setError(shellsRes.message || 'Impossibile elencare le shells');
      }
    } catch (err: any) {
      setError(err?.message || 'Errore di connessione');
    } finally {
      setPinging(false);
    }
  };

  const handlePull = async () => {
    if (!selectedShell) return;
    setPulling(true);
    setError(null);
    try {
      const res = await pull(baseUrl.trim(), buildAuth(), selectedShell);
      if (res.status !== 'Success' || !res.data?.shell) {
        setError(res.message || 'Pull fallito');
        return;
      }
      const model = mapEnvironmentToModel(
        { shell: res.data.shell, submodels: res.data.submodels ?? [] },
        { idPrefix: 'remote' },
      );
      importAas(model);
      const failed = res.data.failed?.length ?? 0;
      showSnackbar(
        `Caricato "${model.idShort}" — ${model.submodels.length} submodel${failed ? `, ${failed} non risolti` : ''}`,
        failed ? 'warning' : 'success',
      );
      handleClose();
    } catch (err: any) {
      setError(err?.message || 'Errore durante il pull');
    } finally {
      setPulling(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <LanRounded color="primary" />
        <Box>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            Connetti a un AAS Server
          </Typography>
          <Typography variant="caption" color="text.disabled" fontFamily="monospace">
            IDTA 01002-3-0 Part 2 · pull → edit → commit
          </Typography>
        </Box>
        <Box flexGrow={1} />
        <IconButton size="small" onClick={handleClose}>
          <CloseRounded fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Connection */}
        <TextField
          label="Base URL del server"
          size="small"
          fullWidth
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="https://aas.example.com/api/v3.0"
          slotProps={{ input: { sx: { fontFamily: 'monospace', fontSize: 12 } } }}
        />

        <Stack direction="row" spacing={1.5}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Autenticazione</InputLabel>
            <Select
              label="Autenticazione"
              value={authType}
              onChange={(e) => setAuthType(e.target.value as AuthType)}
            >
              <MenuItem value="none">Nessuna</MenuItem>
              <MenuItem value="bearer">Bearer token</MenuItem>
              <MenuItem value="basic">Basic auth</MenuItem>
            </Select>
          </FormControl>

          {authType === 'bearer' && (
            <TextField
              label="Token" size="small" fullWidth type="password"
              value={token} onChange={(e) => setToken(e.target.value)}
            />
          )}
          {authType === 'basic' && (
            <>
              <TextField label="Username" size="small" fullWidth
                value={username} onChange={(e) => setUsername(e.target.value)} />
              <TextField label="Password" size="small" fullWidth type="password"
                value={password} onChange={(e) => setPassword(e.target.value)} />
            </>
          )}
        </Stack>

        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={!baseUrl.trim() || pinging}
          startIcon={pinging ? <CircularProgress size={14} /> : <LanRounded />}
        >
          {pinging ? 'Connessione…' : 'Testa connessione'}
        </Button>

        {error && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ color: 'error.main' }}>
            <ErrorOutlineRounded fontSize="small" />
            <Typography variant="caption">{error}</Typography>
          </Stack>
        )}

        {connected && (
          <>
            <Divider />
            <Stack direction="row" spacing={1} alignItems="center">
              <CheckCircleRounded fontSize="small" color="success" />
              <Typography variant="caption" color="success.main" fontWeight={600}>
                Connesso
              </Typography>
              {profiles.length > 0 && (
                <Typography variant="caption" color="text.disabled" fontFamily="monospace" noWrap>
                  {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
                </Typography>
              )}
            </Stack>

            {shells.length === 0 ? (
              <Typography variant="caption" color="text.disabled">
                Nessuna shell trovata sul server.
              </Typography>
            ) : (
              <FormControl size="small" fullWidth>
                <InputLabel>Shell da importare</InputLabel>
                <Select
                  label="Shell da importare"
                  value={selectedShell}
                  onChange={(e) => setSelectedShell(e.target.value)}
                  sx={{ fontFamily: 'monospace', fontSize: 12 }}
                >
                  {shells.map((s) => (
                    <MenuItem key={s.id} value={s.id} sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                      {s.idShort || s.id}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {selectedShell && (
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                  La shell verrà caricata nell'editor come working copy (non committata).
                  Usa <strong>Commit</strong> per salvarla nella history locale.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handlePull}
                  disabled={pulling}
                  startIcon={pulling ? <CircularProgress size={14} color="inherit" /> : <CloudDownloadRounded />}
                >
                  {pulling ? 'Pull in corso…' : 'Importa nell’editor'}
                </Button>
              </Paper>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

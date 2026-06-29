import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Avatar,
  Box,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  FormControl,
  MenuItem,
  Paper,
  Select,
  Stack,
  Typography,
} from '@mui/material';
import {
  AddRounded,
  EditRounded,
  ExpandMoreRounded,
  Inventory2Rounded,
  RemoveRounded,
  ScheduleRounded,
} from '@mui/icons-material';

import { useAASContext } from '@/context/AASContext';
import { useDialogContext } from '@/context/DialogContext';
import { useAASVersioning } from '@/hooks/useAASVersioning';
import ConfirmExportDialog from '@/pages/secure/AASEditor/dialogs/ConfirmExportDialog';
import type { VersionStatus, ChangeType, AASVersion } from '@/context/AASContext';

// ── Helpers ───────────────────────────────────────────────────────────────────

type MuiColor = 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';

const statusChipColor = (s: VersionStatus): MuiColor =>
  s === 'Active' ? 'success' : s === 'Draft' ? 'warning' : 'default';

const statusDotColor = (s: VersionStatus): string =>
  s === 'Active' ? 'success.main' : s === 'Draft' ? 'warning.main' : 'text.disabled';

const changeChipColor: Record<ChangeType, MuiColor> = {
  added: 'success',
  modified: 'warning',
  removed: 'error',
};

const changeIconColor: Record<ChangeType, string> = {
  added: 'success.main',
  modified: 'warning.main',
  removed: 'error.main',
};

const changeBgColor: Record<ChangeType, string> = {
  added: 'rgba(16,185,129,.08)',
  modified: 'rgba(245,166,35,.08)',
  removed: 'rgba(240,82,82,.08)',
};

const changeIconEl = {
  added: <AddRounded sx={{ fontSize: 14 }} />,
  modified: <EditRounded sx={{ fontSize: 14 }} />,
  removed: <RemoveRounded sx={{ fontSize: 14 }} />,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function AASLifecycle() {
  const { selectedModelId, setSelectedModelId, availableModels, loading } = useAASContext();
  const { setHandlers } = useDialogContext();
  const { getLog } = useAASVersioning();

  const currentModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];

  // Full version history from DB (if document is persisted)
  const [dbVersions, setDbVersions] = useState<AASVersion[]>([]);
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    if (!currentModel?.documentId) {
      setDbVersions([]);
      return;
    }
    setLogLoading(true);
    getLog(currentModel.documentId)
      .then(res => {
        const commits = res.data?.commits ?? [];
        setDbVersions(commits.map((c: any) => ({
          version: c.version,
          revision: c.revision,
          date: c.createdAt,
          status: c.status as VersionStatus,
          author: c.author ? `${c.author.user?.name ?? ''} ${c.author.user?.surname ?? ''}`.trim() : '',
          changes: c.message,
          details: (c.diffs ?? []).map((d: any) => ({
            type: d.change_type as ChangeType,
            target: d.target,
            name: d.name,
            desc: d.description ?? '',
          })),
        })));
      })
      .catch(() => setDbVersions([]))
      .finally(() => setLogLoading(false));
    // Re-fetch when a new commit advances HEAD (its createdAt changes), so the
    // timeline reflects edits committed from the editor without a full reload.
  }, [currentModel?.documentId, currentModel?.versions?.[0]?.date]); // eslint-disable-line react-hooks/exhaustive-deps

  // Use DB history when available, fall back to local versions
  const versions = useMemo(
    () => (dbVersions.length > 0 ? dbVersions : currentModel?.versions ?? []),
    [dbVersions, currentModel]
  );

  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [showExportDialog, setShowExportDialog] = useState(false);

  const toggleVersion = (i: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const allChanges = versions.flatMap(v => v.details || []);

  const exportChangelog = useCallback(() => {
    if (!currentModel) return;
    const lines: string[] = [`# Changelog — ${currentModel.idShort}`, `assetId: ${currentModel.assetId}`, ''];
    versions.forEach(v => {
      lines.push(`## v${v.version} rev ${v.revision} (${v.status}) — ${new Date(v.date).toLocaleDateString('it-IT')}`);
      lines.push(`*${v.author}*`);
      lines.push('');
      lines.push(v.changes);
      lines.push('');
      (v.details || []).forEach(d => {
        lines.push(`- [${d.type.toUpperCase()}] **${d.name}** (${d.target}): ${d.desc}`);
      });
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `changelog-${currentModel.idShort}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [currentModel]);

  // Register sidebar handler — opens the confirmation dialog rather than
  // exporting straight away.
  useEffect(() => {
    setHandlers({ onExportChangelog: () => setShowExportDialog(true) });
    return () => setHandlers({});
  }, [setHandlers]);

  const latestVersion = versions[0] ?? currentModel?.versions?.[0];

  // No model loaded yet (e.g. first access with a clean cache, before
  // refreshModels resolves). Render a safe placeholder instead of crashing on
  // the undefined latestVersion access below — which produced the white page.
  if (!currentModel || !latestVersion) {
    return (
      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 4 }}>
        <Stack alignItems="center" spacing={1.5}>
          {loading ? (
            <>
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Caricamento modelli…
              </Typography>
            </>
          ) : (
            <>
              <Inventory2Rounded sx={{ fontSize: 40, color: 'text.disabled' }} />
              <Typography variant="body2" color="text.disabled">
                Nessun modello disponibile
              </Typography>
              <Typography variant="caption" color="text.disabled" textAlign="center">
                Crea o importa un AAS nell'editor per vederne la cronologia.
              </Typography>
            </>
          )}
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ── Toolbar ── */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        sx={{ px: 3, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper', flexShrink: 0 }}
      >
        <FormControl size="small">
          <Select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            sx={{ fontFamily: 'monospace', fontSize: 11 }}
          >
            {availableModels.map(m => (
              <MenuItem key={m.id} value={m.id} sx={{ fontFamily: 'monospace', fontSize: 11 }}>
                {m.idShort.replace('AAS_', '')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Stack direction="row" alignItems="center" spacing={0.75}>
          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: statusDotColor(latestVersion.status) }} />
          <Typography variant="caption" color="text.disabled" fontFamily="monospace">
            v{latestVersion.version} · {latestVersion.status} · {currentModel.assetKind}
          </Typography>
        </Stack>
      </Stack>

      {/* ── Content ── */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 3.5, py: 3.5 }}>
        <Box sx={{ maxWidth: 860, mx: 'auto' }}>

          {/* ── Model header ── */}
          <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={3.5}>
            <Avatar
              sx={{
                width: 40,
                height: 40,
                borderRadius: 2,
                background: (theme) =>
                  `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.light})`,
                flexShrink: 0,
              }}
            >
              <Inventory2Rounded />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800} letterSpacing={-0.5}>
                {currentModel.idShort}
              </Typography>
              <Typography variant="body2" color="text.secondary" mt={0.25}>
                {currentModel.description}
              </Typography>
              <Typography variant="caption" color="text.disabled" fontFamily="monospace" display="block" mt={0.5}>
                {currentModel.assetId}
              </Typography>
            </Box>
          </Stack>

          {/* ── Stats ── */}
          <Stack direction="row" spacing={1.5} flexWrap="wrap" mb={3.5}>
            {([
              ['Versioni', versions.length, 'primary.main'],
              ['Aggiunte', allChanges.filter(d => d.type === 'added').length, 'success.main'],
              ['Modifiche', allChanges.filter(d => d.type === 'modified').length, 'warning.main'],
              ['Rimozioni', allChanges.filter(d => d.type === 'removed').length, 'error.main'],
            ] as [string, number, string][]).map(([label, value, color]) => (
              <Paper key={label} variant="outlined" sx={{ px: 2.25, py: 1.5, minWidth: 100 }}>
                <Typography variant="h4" fontWeight={800} fontFamily="monospace" sx={{ color }}>
                  {value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
              </Paper>
            ))}
          </Stack>

          {/* ── Timeline ── */}
          <Box sx={{ position: 'relative', pl: 3.5 }}>
            {/* Vertical line */}
            <Box sx={{ position: 'absolute', left: 10, top: 0, bottom: 0, width: 2, bgcolor: 'divider' }} />

            {logLoading && (
              <Typography variant="caption" color="text.disabled" fontFamily="monospace" display="block" mb={2}>
                Caricamento storico dal server…
              </Typography>
            )}
            {versions.map((v, idx) => {
              const isOpen = expanded.has(idx);
              return (
                <Box key={idx} sx={{ position: 'relative', mb: isOpen ? 3 : 1.5 }}>

                  {/* Timeline dot */}
                  <Box
                    sx={{
                      position: 'absolute',
                      left: -22,
                      top: 16,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      bgcolor: statusDotColor(v.status),
                      border: '3px solid',
                      borderColor: 'background.default',
                      zIndex: 2,
                    }}
                  />

                  <Paper
                    variant="outlined"
                    sx={{ overflow: 'hidden', cursor: 'pointer' }}
                    onClick={() => toggleVersion(idx)}
                  >
                    {/* Version header row */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      spacing={1.5}
                      flexWrap="wrap"
                      sx={{ px: 2.5, py: 2 }}
                    >
                      <Typography variant="h6" fontWeight={800} fontFamily="monospace">
                        v{v.version}
                      </Typography>
                      <Typography variant="caption" color="text.disabled" fontFamily="monospace">
                        rev {v.revision}
                      </Typography>
                      <Chip
                        size="small"
                        label={v.status}
                        color={statusChipColor(v.status)}
                        variant="outlined"
                      />
                      <Box flexGrow={1} />
                      <Stack direction="row" alignItems="center" spacing={0.75}>
                        <ScheduleRounded sx={{ fontSize: 12, color: 'text.disabled' }} />
                        <Typography variant="caption" color="text.secondary">
                          {new Date(v.date).toLocaleDateString('it-IT', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                        {v.author}
                      </Typography>
                      <ExpandMoreRounded
                        sx={{
                          color: 'text.secondary',
                          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s',
                          fontSize: 20,
                        }}
                      />
                    </Stack>

                    {/* Summary */}
                    <Typography variant="body2" color="text.secondary" px={2.5} pb={1.75}>
                      {v.changes}
                    </Typography>

                    {/* Detailed changelog */}
                    <Collapse in={isOpen}>
                      {(v.details || []).length > 0 && (
                        <>
                          <Divider />
                          <Box sx={{ px: 2.5, py: 2 }}>
                            <Typography variant="overline" color="text.disabled" display="block" mb={1.25}>
                              Changelog dettagliato
                            </Typography>
                            {(v.details || []).map((d, di) => (
                              <Stack
                                key={di}
                                direction="row"
                                alignItems="flex-start"
                                spacing={1.25}
                                sx={{ p: 1, mb: 0.5, borderRadius: 1, bgcolor: changeBgColor[d.type] }}
                              >
                                <Box
                                  sx={{
                                    color: changeIconColor[d.type],
                                    display: 'flex',
                                    alignItems: 'center',
                                    pt: 0.25,
                                    flexShrink: 0,
                                  }}
                                >
                                  {changeIconEl[d.type]}
                                </Box>
                                <Box flex={1}>
                                  <Stack direction="row" alignItems="center" spacing={0.75} mb={0.5}>
                                    <Chip
                                      size="small"
                                      label={d.target}
                                      color={changeChipColor[d.type]}
                                      variant="outlined"
                                      sx={{ fontSize: 9, height: 18, fontFamily: 'monospace' }}
                                    />
                                    <Typography variant="caption" fontWeight={600} fontFamily="monospace">
                                      {d.name}
                                    </Typography>
                                  </Stack>
                                  <Typography variant="caption" color="text.secondary" display="block">
                                    {d.desc}
                                  </Typography>
                                </Box>
                              </Stack>
                            ))}
                          </Box>
                        </>
                      )}
                    </Collapse>
                  </Paper>
                </Box>
              );
            })}
          </Box>

        </Box>
      </Box>

      <ConfirmExportDialog
        open={showExportDialog}
        fileName={`changelog-${currentModel.idShort}.md`}
        title="Esporta changelog"
        message="Vuoi davvero esportare il changelog del modello corrente? Il file Markdown verrà scaricato sul tuo dispositivo."
        onClose={() => setShowExportDialog(false)}
        onConfirm={() => { exportChangelog(); setShowExportDialog(false); }}
      />
    </Box>
  );
}

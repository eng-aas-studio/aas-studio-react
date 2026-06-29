import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Grow,
} from '@mui/material';
import { FileDownloadRounded } from '@mui/icons-material';

interface ConfirmExportDialogProps {
  open: boolean;
  fileName: string;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConfirmExportDialog({
  open,
  fileName,
  title = 'Esporta AASX',
  message = 'Vuoi davvero esportare il modello corrente? Il file verrà scaricato sul tuo dispositivo.',
  onConfirm,
  onClose,
}: ConfirmExportDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slots={{ transition: Grow }}
      slotProps={{ transition: { timeout: 250 } }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1 }}>
        <FileDownloadRounded color="primary" />
        <Typography variant="h6" fontWeight={700}>
          {title}
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
        <Box
          sx={{
            mt: 2,
            px: 2,
            py: 1.5,
            borderRadius: 2,
            bgcolor: 'action.hover',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Typography variant="body2" fontWeight={700} fontFamily="monospace" color="text.secondary" noWrap>
            {fileName}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" size="small">
          Annulla
        </Button>
        <Button
          onClick={onConfirm}
          variant="contained"
          color="primary"
          size="small"
          startIcon={<FileDownloadRounded />}
        >
          Esporta
        </Button>
      </DialogActions>
    </Dialog>
  );
}

import { alpha, Theme, Components } from '@mui/material/styles';
import { gray, brand, violet } from '../themePrimitives';

/* eslint-disable import/prefer-default-export */
export const surfacesCustomizations: Components<Theme> = {
  MuiAccordion: {
    defaultProps: { elevation: 0, disableGutters: true },
    styleOverrides: {
      root: ({ theme }: { theme: any }) => ({
        padding: 4, overflow: 'clip', backgroundColor: (theme.vars || theme).palette.background.default,
        border: '1px solid', borderColor: (theme.vars || theme).palette.divider,
        ':before': { backgroundColor: 'transparent' },
        '&:not(:last-of-type)': { borderBottom: 'none' },
        '&:first-of-type': { borderTopLeftRadius: (theme.vars || theme).shape.borderRadius, borderTopRightRadius: (theme.vars || theme).shape.borderRadius },
        '&:last-of-type': { borderBottomLeftRadius: (theme.vars || theme).shape.borderRadius, borderBottomRightRadius: (theme.vars || theme).shape.borderRadius },
      }),
    },
  },
  MuiAccordionSummary: {
    styleOverrides: {
      root: ({ theme }: { theme: any }) => ({
        border: 'none', borderRadius: 10,
        '&:hover': { backgroundColor: gray[50] }, '&:focus-visible': { backgroundColor: 'transparent' },
        ...theme.applyStyles('dark', { '&:hover': { backgroundColor: gray[800] } }),
      }),
    },
  },
  MuiAccordionDetails: { styleOverrides: { root: { mb: 20, border: 'none' } } },
  MuiPaper: {
    defaultProps: { elevation: 0 },
    styleOverrides: {
      root: ({ theme }: { theme: any }) => ({ '.MuiDialog-paper&': { backgroundColor: (theme.vars || theme).palette.background.paper } }),
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: ({ theme }: { theme: any }) => ({
        backgroundColor: (theme.vars || theme).palette.background.paper,
        border: '1px solid',
        borderColor: alpha(brand[300], 0.18),
        borderRadius: 16,
        boxShadow: `0 24px 64px ${alpha(brand[400], 0.12)}, 0 8px 24px hsla(220, 30%, 5%, 0.15)`,
        backdropFilter: 'blur(4px)',
        ...theme.applyStyles('dark', {
          borderColor: alpha(brand[400], 0.12),
          boxShadow: `0 24px 64px hsla(220, 30%, 0%, 0.6), 0 0 0 1px ${alpha(brand[400], 0.08)}`,
        }),
      }),
    },
  },
  MuiCard: {
    styleOverrides: {
      root: ({ theme }: { theme: any }) => ({
        padding: 16,
        gap: 16,
        transition: 'transform 200ms ease, box-shadow 200ms ease, background-image 200ms ease',
        borderRadius: 16,
        border: '1.5px solid transparent',
        backgroundImage: `linear-gradient(${gray[50]}, ${gray[50]}), linear-gradient(135deg, ${alpha(brand[300], 0.55)}, ${alpha(violet[400], 0.45)})`,
        backgroundOrigin: 'padding-box, border-box',
        backgroundClip: 'padding-box, border-box',
        backgroundColor: 'transparent',
        boxShadow: `0 2px 12px ${alpha(brand[400], 0.06)}, 0 1px 4px hsla(220, 30%, 5%, 0.04)`,
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 12px 36px ${alpha(brand[400], 0.16)}, 0 4px 12px ${alpha(brand[400], 0.1)}`,
          backgroundImage: `linear-gradient(${gray[50]}, ${gray[50]}), linear-gradient(135deg, ${alpha(brand[400], 0.9)}, ${alpha(violet[400], 0.75)})`,
        },
        ...theme.applyStyles('dark', {
          backgroundImage: `linear-gradient(${gray[800]}, ${gray[800]}), linear-gradient(135deg, ${alpha(brand[400], 0.38)}, ${alpha(violet[400], 0.28)})`,
          backgroundOrigin: 'padding-box, border-box',
          backgroundClip: 'padding-box, border-box',
          boxShadow: `0 2px 12px hsla(220, 30%, 0%, 0.45), 0 0 0 1px ${alpha(brand[400], 0.06)}`,
          '&:hover': {
            boxShadow: `0 12px 40px hsla(220, 30%, 0%, 0.6), 0 0 0 1.5px ${alpha(brand[400], 0.3)}, 0 0 24px ${alpha(brand[400], 0.12)}`,
            backgroundImage: `linear-gradient(${gray[800]}, ${gray[800]}), linear-gradient(135deg, ${alpha(brand[400], 0.7)}, ${alpha(violet[400], 0.55)})`,
          },
        }),
        variants: [{
          props: { variant: 'outlined' },
          style: {
            backgroundImage: `linear-gradient(hsl(0, 0%, 100%), hsl(0, 0%, 100%)), linear-gradient(135deg, ${alpha(brand[300], 0.5)}, ${alpha(violet[300], 0.4)})`,
            backgroundOrigin: 'padding-box, border-box',
            backgroundClip: 'padding-box, border-box',
            boxShadow: 'none',
            ...theme.applyStyles('dark', {
              backgroundImage: `linear-gradient(${alpha(gray[900], 0.4)}, ${alpha(gray[900], 0.4)}), linear-gradient(135deg, ${alpha(brand[400], 0.3)}, ${alpha(violet[400], 0.22)})`,
              backgroundOrigin: 'padding-box, border-box',
              backgroundClip: 'padding-box, border-box',
            }),
          },
        }],
      }),
    },
  },
  MuiCardContent: { styleOverrides: { root: { padding: 0, '&:last-child': { paddingBottom: 0 } } } },
  MuiCardHeader: { styleOverrides: { root: { padding: 0 } } },
  MuiCardActions: { styleOverrides: { root: { padding: 0 } } },
};

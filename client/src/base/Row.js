import React from 'react';
import { Grid } from '@mui/material';

export function Row({ height, children }) {
  return (
    <Grid container style={{ height: height, marginBottom: '2vh' }} spacing={2}>
      {children}
    </Grid>
  );
}

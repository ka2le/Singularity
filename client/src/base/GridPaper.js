import React from 'react';
import { Grid, Paper, Box } from '@mui/material';

export function GridPaper({ width, children }) {
  return (
    <Grid item xs={width}  style={{ maxHeight: '100%' , height:"100%", overflow: 'auto' }}>
      <Paper style={{ maxHeight: '100%', height:"100%" }}>
          {children}
      </Paper>
    </Grid>
  );
}
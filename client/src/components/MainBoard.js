import React from 'react';
import { Container, Grid, Paper, TextField, Button } from '@mui/material';
import { Row } from '../base/Row'; // replace with your actual file path
import { GridPaper } from '../base/GridPaper'; // replace with your actual file path

export function Board2() {
  return (
    <Container spacing={2}  style={{ height: '100vh' }}>
      <Row height='10vh'>
        <GridPaper width={3}>
          <p style={{ margin: 0 }}>Game Info</p>

        </GridPaper>
        <GridPaper width={6} >
          <TextField label="Input Field" />
        </GridPaper>
        <GridPaper width={3} >
          <Button variant="contained">Button</Button>
        </GridPaper>
      </Row>

      <Row height='60vh'>
      <GridPaper width={4}>
          <p >Drawable Game Cards</p>
        </GridPaper>
        <GridPaper width={8}>
          <p  style={{ margin: 0 }}>Main Game Board</p>
        </GridPaper>
        
      </Row>

      <Row height='25vh'>
        
        <GridPaper width={2}>
          <Button variant="contained">Button</Button>
        </GridPaper>
        <GridPaper width={8}>
          <p style={{ margin: 0 }}>Player's Hand</p>
        </GridPaper>
        <GridPaper width={2}>
          <Button variant="contained">Button</Button>
        </GridPaper>
      </Row>
    </Container>
  );
}

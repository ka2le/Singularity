import React from 'react';
import { Container, Grid, Paper, TextField, Button, Typography } from '@mui/material';
import { Row } from '../base/Row'; // replace with your actual file path
import { GridPaper } from '../base/GridPaper'; // replace with your actual file path


const classes = {
  root: {
    flexGrow: 1
  },
  paper: {
    padding: 20,
    textAlign: "center",
  }
};
//the InnerGrid component will be a collection of multiple Grid items
function InnerGrid() {
  return (
    <>
      <Grid item xs={4}>
        <Paper style={classes.paper}>item</Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper style={classes.paper}>item</Paper>
      </Grid>
      <Grid item xs={4}>
        <Paper style={classes.paper}>item</Paper>
      </Grid>
    </>
  );
}

const RowContainer = ({ xs, children }) => (
  <Grid item xs={xs} sx={{ height: "100%", width: "100vw" }}>
    <Grid container alignItems={"center"} spacing={1} direction={"row"} sx={{ height: "100%" }}>
      {children}
    </Grid>
  </Grid>
);


const GridItem = ({ xs, children }) => (
  <Grid item xs={xs}>
    <Paper style={classes.paper}>
      {children}
    </Paper>

  </Grid>
);
export const Board2 = () => {
  return (
    <Grid container spacing={1} height={"100vh"} direction={"column"}>
      <RowContainer xs={1}>
        <GridItem xs={3}>
          <Typography display="inline" >
            ROOM CODE:
          </Typography>
          <Typography display="inline" color="text.secondary">
            2754
          </Typography>

        </GridItem>
        <GridItem xs={6}>
          <Button>Start Game</Button>
        </GridItem>
        <GridItem xs={3}>
          <Typography display="inline" >
            Opponent:
          </Typography>
          <Typography display="inline" color="text.secondary">
            AI(Until Human Join)
          </Typography>

        </GridItem>
      </RowContainer>
      <RowContainer xs={7}>
        <GridItem xs={3}>Opponent nr of cards on hand <br></br> Played Cards </GridItem>
        <GridItem xs={7}>COMMON CARDS<br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br><br></br></GridItem>
        <GridItem xs={2}>
          <Grid container alignItems={"center"} spacing={1} direction={"column"} >
            <Grid item xs={6}>
              <Paper style={classes.paper}>
                Development Cards
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper style={classes.paper}>
                  Risk <br></br> Cards
              </Paper>
            </Grid>


          </Grid>

        </GridItem>
      </RowContainer>
      <RowContainer xs={4}>
        <GridItem xs={4}>Your Played Cards</GridItem>
        <GridItem xs={6}>CARDS ON HAND HERE</GridItem>
        <GridItem xs={2}><Button>Lock In</Button></GridItem>
      </RowContainer>
    </Grid>
  );
};

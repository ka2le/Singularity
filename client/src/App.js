// MyApp.js
import React from 'react';
import { useRef, useState, useEffect } from 'react';
import Background from './base/Background';
import { Animator } from '@arwes/react-animator';
import Frame from './base/Frame';
import FrameSmall from './base/FrameSmall';
import {
  useBleeps,
  BleepsOnAnimator,
  Animated,
  FrameSVGCorners,
  Text,
  aa,
  aaVisibility
} from '@arwes/react';
import { GameCard } from './components/GameCard';
const duration = { enter: 1000, exit: 1000 };

const MyApp = () => {
  const [activate, setActivate] = React.useState(true);
  return (
    <>
      {/* <Animator  animator={{ duration, activate }}>
        <Background />
        <Frame size={500} >
          <Text>
            Lorem ipsum dolor sit amet, <b>consectetur adipiscing</b> elit,
            sed do eiusmod tempor <i>incididunt <b>ut labore et dolore
              magna</b> aliqua</i>. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco <a href='#'>laboris nisi ut aliquip</a> ex
            ea commodo consequat.
          </Text>
        </Frame>
        
      </Animator> */}
      <GameCard></GameCard>
    </>
  );
};

export default MyApp;

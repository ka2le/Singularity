import React, { useRef } from 'react';
import { useBleeps, Animated, Animator, FrameSVGCorners, Text, aa, aaVisibility } from '@arwes/react';
import { FrameSVGKranox, useFrameSVGAssemblingAnimation } from '@arwes/react-frames';
import { GridLines, Dots, MovingLines } from '@arwes/react-bgs';

const Background = () => (
  <div style={{
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#000906',
    backgroundImage: 'radial-gradient(85% 85% at 50% 50%, hsla(185, 100%, 25%, 0.25) 0%, hsla(185, 100%, 25%, 0.12) 50%, hsla(185, 100%, 25%, 0) 100%)'
  }}>
    <GridLines lineColor='hsla(180, 100%, 75%, 0.05)' distance={30} />
    <Dots color='hsla(180, 100%, 75%, 0.05)' distance={30} />
    <MovingLines lineColor='hsla(180, 100%, 75%, 0.07)' distance={30} sets={20} />
  </div>
);

const Content = () => {
  const bleeps = useBleeps();

  return (
    <Animator>
      <Animated
        style={{
          position: 'relative',
          display: 'block',
          maxWidth: '300px',
          margin: '1rem auto',
          padding: '2rem',
          textAlign: 'center'
        }}
        animated={[aaVisibility(), aa('y', '2rem', 0)]}
        onClick={() => bleeps.click?.play()}
      >
        <Animator>
          <style>{`
            :where(.arwes-react-frames-framesvg [data-name=line]) {
              color: hsla(100deg, 100%, 50%);
            }
            :where(.arwes-react-frames-framesvg [data-name=bg]) {
              color: hsla(100deg, 100%, 75%, 0.05)
            }
          `}</style>
          <FrameSVGCorners strokeWidth={2} />
        </Animator>
        <Animator>
          <Text as='h1'>Arwes Project</Text>
        </Animator>
        <Animator>
          <Text>Futuristic science fiction user interface web framework.</Text>
        </Animator>
      </Animated>
    </Animator>
  );
};

const Frame = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { onRender } = useFrameSVGAssemblingAnimation(svgRef);

  return (
    <div css={{
      position: 'relative',
      width: 300,
      height: 500,
      '[data-name=bg]': { color: 'hsl(60, 75%, 10%)', filter: 'drop-shadow(0 0 4px hsl(60, 75%, 10%))' },
      '[data-name=line]': { color: 'hsl(60, 75%, 50%)',filter: 'drop-shadow(0 0 4px hsl(60, 75%, 50%))' }
    }}>
      <FrameSVGKranox
        elementRef={svgRef}
        onRender={onRender}
        padding={4}
        strokeWidth={2}
        squareSize={12}
        smallLineLength={12}
        largeLineLength={48}
      >
        <Content />
      </FrameSVGKranox>
    </div>
  );
};

const Board = () => (
  <Animator duration={{ interval: 10 }}>
    <Background />
    <Frame />
  </Animator>
);

export default Board;

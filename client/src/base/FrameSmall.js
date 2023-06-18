import { useRef, useState, useEffect } from 'react';
import { Animator } from '@arwes/react-animator';
import { FrameSVGOctagon, useFrameSVGAssemblingAnimation } from '@arwes/react-frames';

const Frame = () => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const { onRender } = useFrameSVGAssemblingAnimation(svgRef);

  return (
    <div css={{
      position: 'relative',
      width: 300,
      height: 150,

      '[data-name=bg]': {
        color: 'hsl(60, 75%, 10%)',
        filter: 'drop-shadow(0 0 4px hsl(60, 75%, 10%))'
      },
      '[data-name=line]': {
        color: 'hsl(60, 75%, 50%)',
        filter: 'drop-shadow(0 0 4px hsl(60, 75%, 50%))'
      }
    }}>
      <FrameSVGOctagon
        elementRef={svgRef}
        onRender={onRender}
        padding={4}
      />
    </div>
  );
};

const FrameSmall = () => {
  const [active, setActive] = useState(true);

  useEffect(() => {
    const tid = setInterval(() => setActive(active => !active), 2000);
    return () => clearInterval(tid);
  }, []);

  return (
    <Animator active={active}>
      <Frame />
    </Animator>
  );
};

export default FrameSmall;
import { BaseGameEngineProps } from '../../types';

export interface VortilexCoord {
  r: number;
  c: number;
}

export interface VortilexFeedback {
  text: string;
  isError?: boolean;
}

export type VortilexEngineProps = BaseGameEngineProps;

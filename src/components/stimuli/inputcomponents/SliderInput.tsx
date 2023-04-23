import {Slider} from '@mantine/core';
import {Option} from '../../../parser/types';

export type sliderProps = {
    label:string,
    value:number,
}

type inputProps = {
    sliderData?: Option[],
    answer:object;
    title: string;
    desc: string;
    required: boolean;
}

export default function SliderInput({ sliderData=[], answer }: inputProps) {
    return (
        <>
            <Slider
                marks={sliderData as sliderProps[]}
                {...answer}
            />
        </>
    );
}

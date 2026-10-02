'use client';

import {useLayoutEffect} from 'react';

export default function HydrationStabilizer(){
  useLayoutEffect(()=>{
    document.body.dataset.hydrating='false';
    return()=>{};
  },[]);
  return null;
}

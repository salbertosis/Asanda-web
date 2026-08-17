import React from 'react';

const HERO_IMAGE = '/assets/hero.svg';

const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden bg-asanda-cyan" aria-hidden="true">
    <img
      src={HERO_IMAGE}
      alt=""
      loading="eager"
      className="h-full w-full object-cover object-center opacity-[0.08] mix-blend-multiply"
    />
    <div className="absolute -left-16 top-[10%] h-52 w-52 rounded-full bg-white/20 blur-3xl sm:h-80 sm:w-80" />
    <div className="absolute right-[8%] top-[8%] h-32 w-32 rounded-full bg-asanda-orange/25 blur-3xl sm:h-56 sm:w-56" />
    <div className="absolute -bottom-24 -right-24 size-80 rounded-full border-[42px] border-asanda-navy/15 sm:size-[30rem]" />
  </div>
);

export default HeroBackground;

import React from 'react';

const HERO_IMAGE = '/assets/hero.svg';

const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden bg-asanda-ink" aria-hidden="true">
    <img
      src={HERO_IMAGE}
      alt=""
      loading="eager"
      className="h-full w-full object-cover object-center opacity-55"
    />
    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,26,46,0.98)_0%,rgba(6,26,46,0.88)_42%,rgba(6,26,46,0.42)_78%,rgba(6,26,46,0.65)_100%)]" />
    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,26,46,0.12)_0%,rgba(6,26,46,0.1)_58%,rgba(6,26,46,0.92)_100%)]" />
    <div className="absolute -bottom-24 -right-24 size-80 rounded-full border-[42px] border-cyan-300/10 sm:size-[30rem]" />
  </div>
);

export default HeroBackground;

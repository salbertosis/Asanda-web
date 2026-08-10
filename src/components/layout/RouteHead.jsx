import { useEffect } from 'react';

const RouteHead = ({ title = 'ASANDA', noindex = false }) => {
  useEffect(() => {
    const previousTitle = document.title;
    const previousRobots = document.head.querySelector('meta[name="robots"]');
    const hadRobotsContent = previousRobots?.hasAttribute('content');
    const previousRobotsContent = previousRobots?.getAttribute('content');
    let createdRobots = null;
    document.title = title === 'ASANDA' ? title : `${title} | ASANDA`;
    if (noindex) {
      const robots = previousRobots ?? document.createElement('meta');
      if (!previousRobots) { robots.name = 'robots'; document.head.appendChild(robots); createdRobots = robots; }
      robots.content = 'noindex,nofollow';
    }
    return () => {
      document.title = previousTitle;
      if (previousRobots) {
        if (!previousRobots.isConnected) document.head.appendChild(previousRobots);
        if (hadRobotsContent) previousRobots.setAttribute('content', previousRobotsContent); else previousRobots.removeAttribute('content');
      } else if (createdRobots?.isConnected) createdRobots.remove();
    };
  }, [title, noindex]);
  return null;
};

export default RouteHead;

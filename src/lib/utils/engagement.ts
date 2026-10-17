// src/lib/utils/engagement.ts
// Plausible made-up engagement counts for tweets whose real numbers aren't
// available. Likes are drawn log-uniformly within the level's range (so
// smaller counts are as likely as bigger ones, like real tweets), and
// reposts/replies are a varying fraction of likes.

export type EngagementLevel = 'low' | 'medium' | 'high';

const LIKES_RANGE: Record<EngagementLevel, [number, number]> = {
  low: [15, 800],
  medium: [1_000, 30_000],
  high: [50_000, 600_000]
};

function logUniform(min: number, max: number) {
  return Math.exp(Math.log(min) + Math.random() * (Math.log(max) - Math.log(min)));
}

function between(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function randomEngagement(level: EngagementLevel) {
  const likes = Math.round(logUniform(...LIKES_RANGE[level]));
  return {
    likes,
    retweets: Math.round(likes * between(0.04, 0.25)),
    replies: Math.round(likes * between(0.005, 0.05))
  };
}

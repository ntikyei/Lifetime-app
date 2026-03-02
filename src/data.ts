import { UserProfile } from './types';

export const DUMMY_PROFILES: UserProfile[] = [
  {
    id: '1',
    name: 'Sarah',
    age: 26,
    location: 'London, UK',
    job: 'Product Designer',
    height: '5\'6"',
    photos: [
      { id: 'p1', url: 'https://picsum.photos/seed/sarah1/400/600', caption: 'Exploring the city' },
      { id: 'p2', url: 'https://picsum.photos/seed/sarah2/400/600' },
      { id: 'p3', url: 'https://picsum.photos/seed/sarah3/400/600', caption: 'Weekend vibes' },
    ],
    prompts: [
      {
        id: 'pr1',
        question: 'I geek out on',
        answer: 'Figma auto-layout and finding the perfect matcha latte.',
      },
      {
        id: 'pr2',
        question: 'A shower thought I recently had',
        answer: 'Why do we press harder on the remote control when the batteries are dying?',
      },
    ],
    bio: 'Looking for someone to explore the city with.',
    lastActive: 'Active 2h ago',
    recentlyUpdated: true,
    compatibility: ['Matches your age preference', 'Also likes coffee'],
    profileCompletion: 90,
  },
  {
    id: '2',
    name: 'James',
    age: 29,
    location: 'Manchester, UK',
    job: 'Software Engineer',
    height: '6\'0"',
    photos: [
      { id: 'p4', url: 'https://picsum.photos/seed/james1/400/600', caption: 'Hiking in the Peak District' },
      { id: 'p5', url: 'https://picsum.photos/seed/james2/400/600' },
    ],
    prompts: [
      {
        id: 'pr3',
        question: 'My simple pleasures',
        answer: 'A clean codebase and a good cup of coffee.',
      },
    ],
    bio: 'Always down for a spontaneous road trip.',
    lastActive: 'Active now',
    compatibility: ['Same city', 'Matches your distance preference'],
    profileCompletion: 75,
  },
  {
    id: '3',
    name: 'Emma',
    age: 24,
    location: 'Bristol, UK',
    job: 'Marketing Manager',
    height: '5\'4"',
    photos: [
      { id: 'p6', url: 'https://picsum.photos/seed/emma1/400/600' },
      { id: 'p7', url: 'https://picsum.photos/seed/emma2/400/600', caption: 'With my golden retriever' },
      { id: 'p8', url: 'https://picsum.photos/seed/emma3/400/600' },
    ],
    prompts: [
      {
        id: 'pr4',
        question: 'The way to win me over is',
        answer: 'Knowing the best hidden food spots in the city.',
      },
      {
        id: 'pr5',
        question: 'I\'m looking for',
        answer: 'Someone who doesn\'t take themselves too seriously.',
      },
    ],
    bio: 'Dog mom to a very energetic golden retriever.',
    lastActive: 'Active 1d ago',
    recentlyUpdated: true,
    compatibility: ['Matches your age preference'],
    profileCompletion: 85,
  }
];


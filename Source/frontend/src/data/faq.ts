export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQS: FaqItem[] = [
  {
    question: "What is ASideNote?",
    answer:
      "ASideNote is a cork board for your notes. It brings note boards, chalk boards, projects, and a calendar together in one app, so you can jot down an idea and turn it into a plan without switching tools.",
  },
  {
    question: "Is ASideNote free to use?",
    answer: "Yep, creating an account and using ASideNote is free right now.",
  },
  {
    question: "What's the difference between a note board and a chalk board?",
    answer:
      "A note board is a cork board for sticky notes and index cards you can drag, resize, and move around. A chalk board is an endless canvas that feels like a real chalkboard, made for sketching and brainstorming.",
  },
  {
    question: "Can I organize boards into projects?",
    answer:
      "Yes. Group related note boards and chalk boards under a project so everything stays in one place.",
  },
  {
    question: "Does ASideNote have a calendar?",
    answer:
      "Yes. The calendar shows your deadlines and milestones at a glance, and it's connected to your projects.",
  },
  {
    question: "Can I collaborate with friends?",
    answer: "Yes. Invite friends to a board or project and work together in real time.",
  },
  {
    question: "Is my data synced across devices?",
    answer:
      "Yes. Everything is tied to your account, so signing in on another device gives you the same workspace.",
  },
  {
    question: "Is there a mobile app?",
    answer: "Not yet, but ASideNote works well in a mobile browser.",
  },
];

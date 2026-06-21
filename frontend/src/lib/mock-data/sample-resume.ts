import { ResumeProfile } from "../schemas/resume";

export const sampleResume: ResumeProfile = {
  contact: {
    fullName: "Alex Rivera",
    email: "alex.rivera@example.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    links: ["https://github.com/alexriveradevs", "https://linkedin.com/in/alexrivera-example"],
  },
  summary: "Results-driven Software Engineer with over 4 years of experience building web applications. Skilled in React, JavaScript, and general software development. Passionate about writing clean code and improving user experiences.",
  skills: [
    "JavaScript",
    "React",
    "Redux",
    "HTML5",
    "CSS3",
    "Node.js",
    "Express",
    "Git",
    "Webpack",
    "Jest",
    "RESTful APIs",
  ],
  experience: [
    {
      company: "InnovateTech Solutions",
      title: "Software Engineer",
      location: "San Francisco, CA",
      startDate: "Oct 2022",
      endDate: "Present",
      bullets: [
        "Built responsive websites using React and Redux for corporate clients, resulting in high customer satisfaction.",
        "Collaborated with project managers and designers to develop new features and user interfaces.",
        "Wrote automated tests using Jest and optimized build sizes to speed up website loading speeds.",
        "Participated in weekly code reviews and sprint planning sessions to maintain high code quality standards.",
      ],
    },
    {
      company: "WebCraft Apps",
      title: "Junior Web Developer",
      location: "Oakland, CA",
      startDate: "Jul 2020",
      endDate: "Sep 2022",
      bullets: [
        "Developed custom dashboard layouts and landing pages with CSS3, HTML5, and vanilla JavaScript.",
        "Maintained and updated customer portals, resolving visual bugs and updating outdated text details.",
        "Integrated REST APIs to load user data dynamically into front-end grid lists.",
      ],
    },
  ],
  projects: [
    {
      name: "Personal Portfolio Site",
      description: "Interactive portfolio showcase demonstrating key projects and front-end skills.",
      bullets: [
        "Designed clean layouts from scratch and implemented responsive media queries.",
        "Integrated contact form submission endpoint with automated spam filters.",
      ],
      technologies: ["React", "HTML5", "CSS3", "Git"],
    },
  ],
  education: [
    {
      institution: "State University of California",
      degree: "Bachelor of Science",
      fieldOfStudy: "Computer Science",
      graduationDate: "May 2020",
      gpa: "3.6",
    },
  ],
  certifications: ["React Certified Developer (2021)"],
};

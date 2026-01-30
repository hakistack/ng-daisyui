import { faker } from '@faker-js/faker';

export interface Person {
  id: string;
  name: string;
  job: string;
  color: string;
  salary: number;
  email?: string;
  department?: string;
  startDate?: Date;
}

/**
 * Predefined job titles for more realistic data
 */
const JOB_TITLES = [
  'Software Engineer',
  'Product Manager',
  'UX Designer',
  'DevOps Engineer',
  'Data Scientist',
  'Marketing Specialist',
  'Sales Representative',
  'Business Analyst',
  'HR Manager',
  'Quality Analyst',
  'Full Stack Developer',
  'Graphic Designer',
  'Support Engineer',
  'Technical Writer',
  'Network Administrator',
  'Customer Success Manager',
  'SEO Specialist',
  'Database Administrator',
  'Business Development Manager',
  'Quality Control Specialist',
  'Desktop Support Technician',
  'Tax Accountant',
  'Project Manager',
] as const;

/**
 * Predefined departments for organizational structure
 */
const DEPARTMENTS = ['Engineering', 'Product', 'Design', 'Marketing', 'Sales', 'Human Resources', 'Finance', 'Operations', 'Customer Support', 'Quality Assurance'] as const;

/**
 * Color palette for consistent theming
 */
const COLORS = [
  'Blue',
  'Purple',
  'Red',
  'Green',
  'Orange',
  'Lavender',
  'Cyan',
  'Magenta',
  'Teal',
  'Yellow',
  'Indigo',
  'Pink',
  'Brown',
  'Chartreuse',
  'Maroon',
  'Rose',
  'Olive',
  'Silver',
  'Gold',
  'Beige',
  'Coral',
  'Mint',
  'Peach',
  'Navy',
  'Crimson',
  'Turquoise',
  'Plum',
  'Khaki',
] as const;

/**
 * Generates a single person with realistic fake data
 */
function generatePerson(): Person {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: faker.string.uuid(),
    name: `${firstName} ${lastName}`,
    job: faker.helpers.arrayElement(JOB_TITLES),
    color: faker.helpers.arrayElement(COLORS),
    salary: faker.number.int({
      min: 30000,
      max: 150000,
    }),
    email: faker.internet.email({ firstName, lastName }),
    department: faker.helpers.arrayElement(DEPARTMENTS),
    startDate: faker.date.between({
      from: '2020-01-01',
      to: new Date(),
    }),
  };
}

/**
 * Generates an array of people with fake data
 * @param count - Number of people to generate (default: 25)
 * @param seed - Optional seed for reproducible results
 */
export function generatePeople(count = 25, seed?: number): Person[] {
  if (seed !== undefined) {
    faker.seed(seed);
  }

  return Array.from({ length: count }, () => generatePerson());
}

/**
 * Pre-generated dataset for immediate use
 * Uses a fixed seed for consistent data across sessions
 */
export const people: Person[] = generatePeople(25, 12345);

/**
 * Utility function to generate people by department
 */
export function generatePeopleByDepartment(peoplePerDepartment = 3): Person[] {
  return DEPARTMENTS.flatMap(department =>
    Array.from({ length: peoplePerDepartment }, () => ({
      ...generatePerson(),
      department,
    })),
  );
}

/**
 * Utility function to generate senior staff with higher salaries
 */
export function generateSeniorStaff(count = 10): Person[] {
  return Array.from({ length: count }, () => ({
    ...generatePerson(),
    job: `Senior ${faker.helpers.arrayElement(JOB_TITLES)}`,
    salary: faker.number.int({
      min: 80000,
      max: 200000,
    }),
  }));
}

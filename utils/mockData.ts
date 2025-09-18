export interface Club {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  coachIds: string[];
}

export interface Class {
  id: string;
  clubId: string;
  name: string;
  type: 'kids' | 'adults';
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  instructor: string;
  maxCapacity: number;
  currentEnrollment: number;
}

export interface Trial {
  id: string;
  firstName: string;
  lastName: string;
  parentName?: string;
  email: string;
  phone: string;
  age: number;
  classType: 'kids' | 'adults';
  clubId: string;
  classId: string;
  trialDate: string;
  status: 'scheduled' | 'completed' | 'no-show' | 'converted';
  notes?: string;
}

export const mockClubs: Club[] = [
  {
    id: 'club1',
    name: 'TMA Chorlton',
    address: 'Chorlton High School, Nell Lane, Manchester M21 7SL',
    phone: '0161 881 5555',
    email: 'chorlton@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club2',
    name: 'TMA Stretford',
    address: 'Stretford Sports Village, King Street, Manchester M32 8AE',
    phone: '0161 865 4444',
    email: 'stretford@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club3',
    name: 'TMA Warrington',
    address: 'Warrington Youth Club, Bewsey Road, Warrington WA5 0JN',
    phone: '01925 244 333',
    email: 'warrington@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club4',
    name: 'TMA Didsbury',
    address: 'Didsbury Leisure Centre, Wilmslow Road, Manchester M20 5PG',
    phone: '0161 445 2222',
    email: 'didsbury@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club5',
    name: 'TMA Cheadle',
    address: 'Cheadle Academy, Station Road, Cheadle SK8 1BR',
    phone: '0161 428 1111',
    email: 'cheadle@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club6',
    name: 'TMA Prestwich',
    address: 'Prestwich Community Centre, Bury New Road, Manchester M25 1AY',
    phone: '0161 773 6666',
    email: 'prestwich@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club7',
    name: 'TMA Romiley',
    address: 'Romiley Methodist Church Hall, Guywood Lane, Stockport SK6 3DR',
    phone: '0161 430 7777',
    email: 'romiley@tma-uk.com',
    coachIds: ['coach1'],
  },
  {
    id: 'club8',
    name: 'TMA Cheadle Hulme',
    address: 'Cheadle Hulme High School, Woods Lane, Cheadle Hulme SK8 7JY',
    phone: '0161 485 8888',
    email: 'cheadlehulme@tma-uk.com',
    coachIds: ['coach1'],
  },
];

export const mockClasses: Class[] = [
  // Chorlton - MONDAY
  {
    id: 'class1',
    clubId: 'club1',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Monday',
    startTime: '17:00',
    endTime: '18:00',
    instructor: 'Coach Sarah',
    maxCapacity: 20,
    currentEnrollment: 15,
  },
  {
    id: 'class2',
    clubId: 'club1',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Monday',
    startTime: '18:30',
    endTime: '19:30',
    instructor: 'Coach Mike',
    maxCapacity: 25,
    currentEnrollment: 12,
  },
  // Stretford - MONDAY
  {
    id: 'class3',
    clubId: 'club2',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Monday',
    startTime: '16:30',
    endTime: '17:30',
    instructor: 'Coach Emma',
    maxCapacity: 18,
    currentEnrollment: 16,
  },
  {
    id: 'class4',
    clubId: 'club2',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Monday',
    startTime: '19:00',
    endTime: '20:00',
    instructor: 'Coach John',
    maxCapacity: 25,
    currentEnrollment: 20,
  },
  // Warrington - MONDAY
  {
    id: 'class5',
    clubId: 'club3',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Monday',
    startTime: '17:15',
    endTime: '18:15',
    instructor: 'Coach Lisa',
    maxCapacity: 20,
    currentEnrollment: 17,
  },
  {
    id: 'class6',
    clubId: 'club3',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Monday',
    startTime: '18:30',
    endTime: '19:30',
    instructor: 'Coach David',
    maxCapacity: 30,
    currentEnrollment: 24,
  },
  // Didsbury - MONDAY
  {
    id: 'class7',
    clubId: 'club4',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Monday',
    startTime: '16:00',
    endTime: '17:00',
    instructor: 'Coach Tom',
    maxCapacity: 22,
    currentEnrollment: 19,
  },
  {
    id: 'class8',
    clubId: 'club4',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Monday',
    startTime: '19:30',
    endTime: '20:30',
    instructor: 'Coach Tom',
    maxCapacity: 20,
    currentEnrollment: 14,
  },
  // Cheadle - MONDAY
  {
    id: 'class9',
    clubId: 'club5',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Monday',
    startTime: '17:30',
    endTime: '18:30',
    instructor: 'Coach Rachel',
    maxCapacity: 25,
    currentEnrollment: 22,
  },
  {
    id: 'class10',
    clubId: 'club5',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Monday',
    startTime: '19:00',
    endTime: '20:00',
    instructor: 'Coach Rachel',
    maxCapacity: 20,
    currentEnrollment: 15,
  },
  // Tuesday Classes
  {
    id: 'class11',
    clubId: 'club2',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Tuesday',
    startTime: '17:00',
    endTime: '18:00',
    instructor: 'Coach Emma',
    maxCapacity: 20,
    currentEnrollment: 18,
  },
  {
    id: 'class12',
    clubId: 'club6',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Tuesday',
    startTime: '16:30',
    endTime: '17:30',
    instructor: 'Coach Alex',
    maxCapacity: 18,
    currentEnrollment: 14,
  },
  {
    id: 'class13',
    clubId: 'club6',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Tuesday',
    startTime: '19:00',
    endTime: '20:00',
    instructor: 'Coach Alex',
    maxCapacity: 22,
    currentEnrollment: 16,
  },
  // Wednesday Classes
  {
    id: 'class14',
    clubId: 'club1',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Wednesday',
    startTime: '17:00',
    endTime: '18:00',
    instructor: 'Coach Sarah',
    maxCapacity: 20,
    currentEnrollment: 14,
  },
  {
    id: 'class15',
    clubId: 'club7',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Wednesday',
    startTime: '16:00',
    endTime: '17:00',
    instructor: 'Coach Ben',
    maxCapacity: 15,
    currentEnrollment: 12,
  },
  {
    id: 'class16',
    clubId: 'club7',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Wednesday',
    startTime: '19:30',
    endTime: '20:30',
    instructor: 'Coach Ben',
    maxCapacity: 20,
    currentEnrollment: 11,
  },
  // Thursday Classes
  {
    id: 'class17',
    clubId: 'club3',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Thursday',
    startTime: '17:00',
    endTime: '18:00',
    instructor: 'Coach Lisa',
    maxCapacity: 20,
    currentEnrollment: 16,
  },
  {
    id: 'class18',
    clubId: 'club8',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Thursday',
    startTime: '16:30',
    endTime: '17:30',
    instructor: 'Coach Sophie',
    maxCapacity: 22,
    currentEnrollment: 20,
  },
  {
    id: 'class19',
    clubId: 'club8',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Thursday',
    startTime: '18:00',
    endTime: '19:00',
    instructor: 'Coach Sophie',
    maxCapacity: 25,
    currentEnrollment: 18,
  },
  // Saturday Classes
  {
    id: 'class20',
    clubId: 'club1',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Saturday',
    startTime: '10:00',
    endTime: '11:00',
    instructor: 'Coach Mike',
    maxCapacity: 25,
    currentEnrollment: 19,
  },
  {
    id: 'class21',
    clubId: 'club2',
    name: 'Kids',
    type: 'kids',
    dayOfWeek: 'Saturday',
    startTime: '09:00',
    endTime: '10:00',
    instructor: 'Coach John',
    maxCapacity: 30,
    currentEnrollment: 24,
  },
  {
    id: 'class22',
    clubId: 'club2',
    name: 'Adults',
    type: 'adults',
    dayOfWeek: 'Saturday',
    startTime: '10:30',
    endTime: '11:30',
    instructor: 'Coach John',
    maxCapacity: 25,
    currentEnrollment: 15,
  },
];

export const mockTrials: Trial[] = [
  {
    id: 'trial1',
    firstName: 'Oliver',
    lastName: 'Thompson',
    parentName: 'Sarah Thompson',
    email: 'sarah.thompson@email.com',
    phone: '0412 345 678',
    age: 6,
    classType: 'kids',
    clubId: 'club1',
    classId: 'class1',
    trialDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
    status: 'scheduled',
    notes: 'Very excited to start martial arts',
  },
  {
    id: 'trial2',
    firstName: 'Emily',
    lastName: 'Chen',
    parentName: 'David Chen',
    email: 'david.chen@email.com',
    phone: '0423 456 789',
    age: 9,
    classType: 'kids',
    clubId: 'club1',
    classId: 'class2',
    trialDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    status: 'scheduled',
    notes: 'Has some experience with karate',
  },
  {
    id: 'trial3',
    firstName: 'Michael',
    lastName: 'Roberts',
    email: 'michael.roberts@email.com',
    phone: '0434 567 890',
    age: 28,
    classType: 'adults',
    clubId: 'club1',
    classId: 'class3',
    trialDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    status: 'scheduled',
    notes: 'Looking to improve fitness and learn self-defense',
  },
  {
    id: 'trial4',
    firstName: 'Sophie',
    lastName: 'Williams',
    parentName: 'Emma Williams',
    email: 'emma.williams@email.com',
    phone: '0445 678 901',
    age: 5,
    classType: 'kids',
    clubId: 'club2',
    classId: 'class6',
    trialDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days from now
    status: 'scheduled',
    notes: 'First time trying martial arts',
  },
  {
    id: 'trial5',
    firstName: 'James',
    lastName: 'Martinez',
    email: 'james.martinez@email.com',
    phone: '0456 789 012',
    age: 35,
    classType: 'adults',
    clubId: 'club2',
    classId: 'class8',
    trialDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
    status: 'scheduled',
    notes: 'Interested in competition training',
  },
  {
    id: 'trial6',
    firstName: 'Liam',
    lastName: 'Johnson',
    parentName: 'Rebecca Johnson',
    email: 'rebecca.johnson@email.com',
    phone: '0467 890 123',
    age: 7,
    classType: 'kids',
    clubId: 'club3',
    classId: 'class11',
    trialDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    status: 'completed',
    notes: 'Great first session, wants to continue',
  },
  {
    id: 'trial7',
    firstName: 'Isabella',
    lastName: 'Brown',
    parentName: 'Mark Brown',
    email: 'mark.brown@email.com',
    phone: '0478 901 234',
    age: 10,
    classType: 'kids',
    clubId: 'club1',
    classId: 'class2',
    trialDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    status: 'converted',
    notes: 'Signed up for full membership after trial',
  },
  {
    id: 'trial8',
    firstName: 'Noah',
    lastName: 'Taylor',
    parentName: 'Jessica Taylor',
    email: 'jessica.taylor@email.com',
    phone: '0489 012 345',
    age: 8,
    classType: 'kids',
    clubId: 'club2',
    classId: 'class7',
    trialDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // Next week
    status: 'scheduled',
    notes: 'Friend of current student',
  },
  {
    id: 'trial9',
    firstName: 'Charlotte',
    lastName: 'Wilson',
    email: 'charlotte.wilson@email.com',
    phone: '0490 123 456',
    age: 42,
    classType: 'adults',
    clubId: 'club3',
    classId: 'class13',
    trialDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(), // 6 days from now
    status: 'scheduled',
    notes: 'Wants to train with daughter who is already a member',
  },
  {
    id: 'trial10',
    firstName: 'Ethan',
    lastName: 'Davis',
    parentName: 'Andrew Davis',
    email: 'andrew.davis@email.com',
    phone: '0401 234 567',
    age: 11,
    classType: 'kids',
    clubId: 'club1',
    classId: 'class2',
    trialDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Yesterday
    status: 'no-show',
    notes: 'Family emergency, wants to reschedule',
  },
];

export const mockStudents = [
  {
    id: 'student1',
    firstName: 'Emma',
    lastName: 'Anderson',
    email: 'emma.anderson@email.com',
    phone: '0412 111 222',
    dateOfBirth: '2014-03-15',
    beltLevel: 'Yellow',
    clubId: 'club1',
    joinDate: '2023-06-01',
    isActive: true,
  },
  {
    id: 'student2',
    firstName: 'Jack',
    lastName: 'Wilson',
    email: 'jack.wilson@email.com',
    phone: '0423 222 333',
    dateOfBirth: '2013-07-22',
    beltLevel: 'Orange',
    clubId: 'club1',
    joinDate: '2023-02-15',
    isActive: true,
  },
  {
    id: 'student3',
    firstName: 'Sophia',
    lastName: 'Lee',
    email: 'sophia.lee@email.com',
    phone: '0434 333 444',
    dateOfBirth: '2015-11-08',
    beltLevel: 'White',
    clubId: 'club2',
    joinDate: '2024-01-10',
    isActive: true,
  },
  {
    id: 'student4',
    firstName: 'Lucas',
    lastName: 'Martin',
    email: 'lucas.martin@email.com',
    phone: '0445 444 555',
    dateOfBirth: '1995-05-20',
    beltLevel: 'Green',
    clubId: 'club1',
    joinDate: '2022-09-01',
    isActive: true,
  },
  {
    id: 'student5',
    firstName: 'Ava',
    lastName: 'Garcia',
    email: 'ava.garcia@email.com',
    phone: '0456 555 666',
    dateOfBirth: '2012-12-03',
    beltLevel: 'Blue',
    clubId: 'club2',
    joinDate: '2021-11-20',
    isActive: true,
  },
  {
    id: 'student6',
    firstName: 'William',
    lastName: 'Rodriguez',
    email: 'william.rodriguez@email.com',
    phone: '0467 666 777',
    dateOfBirth: '1988-08-14',
    beltLevel: 'Brown',
    clubId: 'club3',
    joinDate: '2020-03-15',
    isActive: true,
  },
];

export function getClassesByDay(dayOfWeek: string): Class[] {
  return mockClasses.filter(c => c.dayOfWeek === dayOfWeek);
}

export function getTodaysClasses(): Class[] {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = days[new Date().getDay()];
  return getClassesByDay(today);
}

export function getUpcomingTrials(days: number = 7): Trial[] {
  const cutoff = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return mockTrials
    .filter(t => t.status === 'scheduled' && new Date(t.trialDate) <= cutoff)
    .sort((a, b) => new Date(a.trialDate).getTime() - new Date(b.trialDate).getTime());
}

export function getRecentTrials(days: number = 7): Trial[] {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return mockTrials
    .filter(t => new Date(t.trialDate) >= cutoff)
    .sort((a, b) => new Date(b.trialDate).getTime() - new Date(a.trialDate).getTime());
}
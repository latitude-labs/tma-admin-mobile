import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  beltLevel: string;
  clubId: string;
  joinDate: string;
  isActive: boolean;
  lastSync?: string;
}

interface StudentState {
  students: Student[];
  loading: boolean;
  error: string | null;
  setStudents: (students: Student[]) => void;
  addStudent: (student: Student) => void;
  updateStudent: (id: string, updates: Partial<Student>) => void;
  deleteStudent: (id: string) => void;
  getStudentById: (id: string) => Student | undefined;
  getStudentsByClub: (clubId: string) => Student[];
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useStudentStore = create<StudentState>()(
  persist(
    (set, get) => ({
      students: [],
      loading: false,
      error: null,
      setStudents: (students) => set({ students }),
      addStudent: (student) =>
        set((state) => ({ students: [...state.students, student] })),
      updateStudent: (id, updates) =>
        set((state) => ({
          students: state.students.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),
      deleteStudent: (id) =>
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
        })),
      getStudentById: (id) => get().students.find((s) => s.id === id),
      getStudentsByClub: (clubId) =>
        get().students.filter((s) => s.clubId === clubId),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
    }),
    {
      name: 'student-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
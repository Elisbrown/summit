import { ProjectList } from '@/components/projects/ProjectList';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Projects | Summit',
  description: 'Manage your projects and tasks',
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projects</h1>
          <p className="text-muted-foreground">Manage your projects and Kanban boards</p>
        </div>
      </div>
      
      <ProjectList className="mt-6" />
    </div>
  );
}

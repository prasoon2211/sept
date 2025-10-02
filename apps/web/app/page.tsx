"use client";

import Link from "next/link";
import { useQuery, useMutation } from "@apollo/client/react";
import { GET_PROJECTS } from "@/lib/graphql/queries";
import { CREATE_PROJECT } from "@/lib/graphql/mutations";
import { formatDate } from "@/lib/utils/date";
import { useState } from "react";

interface Project {
  id: string;
  name: string;
  description?: string;
  updatedAt: string;
}

export default function Home() {
  const { data, loading, error, refetch } = useQuery<{ projects: Project[] }>(
    GET_PROJECTS,
  );
  const [createProject] = useMutation(CREATE_PROJECT);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      await createProject({
        variables: {
          input: {
            name: `New Project ${new Date().toLocaleTimeString()}`,
            description: "Created from dashboard",
          },
        },
      });
      await refetch();
    } catch (err) {
      console.error("Error creating project:", err);
    } finally {
      setIsCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading projects...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Error loading projects: {error.message}</p>
      </div>
    );
  }

  const projects = data?.projects || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Sept</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <button
            onClick={handleCreateProject}
            disabled={isCreating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isCreating ? "Creating..." : "New Project"}
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">No projects yet</p>
            <button
              onClick={handleCreateProject}
              className="text-blue-600 hover:text-blue-700"
            >
              Create your first project
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="block bg-white p-6 rounded-lg border border-gray-200 hover:border-blue-500 transition-colors"
              >
                <h3 className="text-lg font-medium text-gray-900">
                  {project.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  {project.description || "No description"}
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Updated{" "}
                  {project.updatedAt
                    ? formatDate(project.updatedAt)
                    : "Recently"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

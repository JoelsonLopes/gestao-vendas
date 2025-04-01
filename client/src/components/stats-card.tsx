import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  color?: "primary" | "green" | "yellow" | "purple";
  href?: string;
}

export function StatsCard({ title, value, icon, color = "primary", href }: StatsCardProps) {
  const colorMap = {
    primary: "bg-blue-600 text-white",
    green: "bg-blue-800 text-white",
    yellow: "bg-indigo-600 text-white",
    purple: "bg-purple-600 text-white",
  };

  const cardContent = (
    <Card className="overflow-hidden h-full">
      <CardContent className="p-0">
        <div className="p-5">
          <div className="flex items-center">
            <div className={cn("flex-shrink-0 rounded-md p-3", colorMap[color])}>
              {icon}
            </div>
            <div className="ml-5 w-0 flex-1">
              <dl>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</dt>
                <dd>
                  <div className="text-lg font-medium text-gray-900 dark:text-white">{value}</div>
                </dd>
              </dl>
            </div>
          </div>
        </div>
        {href && (
          <div className="bg-gray-100 dark:bg-gray-800 px-5 py-3">
            <div className="text-sm">
              <Link to={href} className="font-medium text-blue-600 hover:text-purple-600 dark:text-purple-400 dark:hover:text-blue-400 flex items-center">
                <span>Ver todos</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return cardContent;
  }

  return cardContent;
}

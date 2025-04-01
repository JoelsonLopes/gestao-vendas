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
    primary: "bg-primary-500 text-white",
    green: "bg-green-500 text-white",
    yellow: "bg-yellow-500 text-white",
    purple: "bg-purple-500 text-white",
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
          <div className="bg-gray-50 dark:bg-gray-700 px-5 py-3">
            <div className="text-sm">
              <Link to={href} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                Ver todos
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

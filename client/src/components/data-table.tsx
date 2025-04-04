import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  CaretSortIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  DoubleArrowLeftIcon, 
  DoubleArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  Cross2Icon
} from "@radix-ui/react-icons";
import { X } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface Column<T> {
  header: string;
  accessorKey: keyof T;
  cell?: (item: T) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  filterOptions?: string[];
  hidden?: boolean; // Nova propriedade para ocultar uma coluna da visualização
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  keyField: keyof T;
  searchable?: boolean;
  searchPlaceholder?: string;
  initialSortColumn?: keyof T;
  initialSortDirection?: "asc" | "desc";
  onSortChange?: (column: keyof T | null, direction: "asc" | "desc") => void;
}

export function DataTable<T>({
  columns,
  data,
  onRowClick,
  keyField,
  searchable = false,
  searchPlaceholder = "Buscar...",
  initialSortColumn = undefined as unknown as keyof T,
  initialSortDirection = "asc",
  onSortChange
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortColumn, setSortColumn] = useState<keyof T | null>(initialSortColumn);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(initialSortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [showFilters, setShowFilters] = useState(false);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilters]);

  // Notify when sort changes
  useEffect(() => {
    if (onSortChange) {
      onSortChange(sortColumn, sortDirection);
    }
  }, [sortColumn, sortDirection, onSortChange]);

  // Generate filter options for columns that don't have explicit options
  const getFilterOptions = (column: Column<T>) => {
    if (column.filterOptions) return column.filterOptions;
    
    // Generate unique values from data
    const uniqueValues = new Set<string>();
    data.forEach(item => {
      let value = item[column.accessorKey];
      
      // Tratamento especial para valores booleanos
      if (typeof value === 'boolean') {
        // Use any para evitar erros de tipagem específicos
        (value as any) = value ? 'Ativo' : 'Inativo';
      }
      
      if (value !== null && value !== undefined) {
        uniqueValues.add(String(value));
      }
    });
    
    return Array.from(uniqueValues).sort();
  };

  // Filtering
  const filteredData = React.useMemo(() => {
    let result = data;
    
    // Apply text search filter
    if (searchQuery) {
      result = result.filter((item) => {
        // Use as any para evitar erros de tipagem com T genérico
        return Object.values(item as any).some((value) => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchQuery.toLowerCase());
        });
      });
    }
    
    // Apply column-specific filters
    Object.entries(activeFilters).forEach(([columnKey, selectedValues]) => {
      if (selectedValues.length === 0) return;
      
      result = result.filter((item) => {
        let rawValue = item[columnKey as keyof T];
        
        // Converter booleanos para strings identificáveis
        if (typeof rawValue === 'boolean') {
          const boolColumn = columns.find(col => String(col.accessorKey) === columnKey);
          if (boolColumn && boolColumn.filterOptions && boolColumn.filterOptions.length >= 2) {
            // Use any para evitar erros de tipagem específicos a T
            (rawValue as any) = rawValue ? boolColumn.filterOptions[0] : boolColumn.filterOptions[1];
          } else {
            // Use any para evitar erros de tipagem específicos a T
            (rawValue as any) = rawValue ? 'true' : 'false';
          }
        }
        
        const itemValue = String(rawValue || '');
        return selectedValues.includes(itemValue);
      });
    });
    
    return result;
  }, [data, searchQuery, activeFilters]);

  // Sorting
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return filteredData;
    
    return [...filteredData].sort((a, b) => {
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      
      if (aValue === bValue) return 0;
      
      // Handle numeric values
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      // Handle date strings
      if (
        aValue && 
        bValue && 
        typeof aValue === 'string' && 
        typeof bValue === 'string' && 
        !isNaN(Date.parse(aValue)) && 
        !isNaN(Date.parse(bValue))
      ) {
        const dateA = new Date(aValue).getTime();
        const dateB = new Date(bValue).getTime();
        return sortDirection === "asc" ? dateA - dateB : dateB - dateA;
      }
      
      // Default string comparison
      const aString = String(aValue || '').toLowerCase();
      const bString = String(bValue || '').toLowerCase();
      
      const comparison = aString < bString ? -1 : 1;
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);

  // Handle sort
  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Toggle a filter value
  const toggleFilter = (column: keyof T, value: string) => {
    setActiveFilters(prev => {
      const current = prev[column as string] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
        
      return {
        ...prev,
        [column as string]: updated
      };
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    setActiveFilters({});
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      {/* Search and Filter Controls */}
      <div className="flex items-center justify-between">
        {/* Filter Toggle and Active Filters */}
        <div className="flex flex-1 items-center space-x-2">
          {/* Filter Button */}
          {columns.some(col => col.filterable) && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className={showFilters ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
            >
              <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              Filtros
            </Button>
          )}
          
          {/* Active Filters */}
          {Object.keys(activeFilters).length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              {Object.entries(activeFilters).map(([column, values]) => 
                values.map(value => (
                  <Badge key={`${column}-${value}`} variant="outline" className="flex items-center gap-1">
                    <span>
                      {columns.find(col => col.accessorKey === column)?.header || column}: {value}
                    </span>
                    <button 
                      className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"
                      onClick={() => toggleFilter(column as keyof T, value)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))
              )}
              
              <Button 
                variant="link" 
                size="sm" 
                onClick={clearAllFilters}
                className="text-xs"
              >
                Limpar filtros
              </Button>
            </div>
          )}
        </div>
        
        {/* Search input */}
        {searchable && (
          <div className="relative w-64">
            <Input
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            {searchQuery && (
              <div 
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Filter Dropdown Options (only visible when filters are shown) */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md mb-4">
          {columns.filter(col => col.filterable).map((column) => (
            <div key={column.accessorKey as string} className="space-y-2">
              <h4 className="text-sm font-medium">{column.header}</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {getFilterOptions(column).map(option => (
                  <div key={option} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`filter-${String(column.accessorKey)}-${option}`}
                      checked={
                        (activeFilters[column.accessorKey as string] || []).includes(option)
                      }
                      onChange={() => toggleFilter(column.accessorKey, option)}
                      className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label 
                      htmlFor={`filter-${String(column.accessorKey)}-${option}`}
                      className="text-sm text-gray-700 dark:text-gray-300"
                    >
                      {option || "(Vazio)"}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50 dark:bg-gray-800 sticky top-0">
            <TableRow>
              {columns.map((column, index) => (
                // Somente renderizar colunas não marcadas como ocultas
                !column.hidden && (
                  <TableHead key={index} className="text-muted-foreground">
                    {column.sortable ? (
                      <button
                        className="flex items-center hover:text-foreground w-full"
                        onClick={() => handleSort(column.accessorKey)}
                      >
                        <span>{column.header}</span>
                        {sortColumn === column.accessorKey ? (
                          sortDirection === "asc" ? (
                            <ChevronUpIcon className="ml-1 h-4 w-4" />
                          ) : (
                            <ChevronDownIcon className="ml-1 h-4 w-4" />
                          )
                        ) : (
                          <CaretSortIcon className="ml-1 h-4 w-4 opacity-50" />
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center">
                        <span>{column.header}</span>
                      </div>
                    )}
                  </TableHead>
                )
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.filter(col => !col.hidden).length} className="h-24 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-10 w-10 mb-2" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={1.5} 
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                      />
                    </svg>
                    <span className="text-sm">Nenhum registro encontrado.</span>
                    {searchQuery && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        onClick={() => setSearchQuery("")}
                        className="mt-2"
                      >
                        Limpar busca
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <TableRow
                  key={String(item[keyField])}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={onRowClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800" : undefined}
                >
                  {columns.map((column, index) => (
                    // Somente renderizar células de colunas não marcadas como ocultas
                    !column.hidden && (
                      <TableCell key={index}>
                        {column.cell ? column.cell(item) : String(item[column.accessorKey] || '')}
                      </TableCell>
                    )
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination and Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{startIndex + 1}</span> a{" "}
          <span className="font-medium">{Math.min(startIndex + pageSize, sortedData.length)}</span> de{" "}
          <span className="font-medium">{sortedData.length}</span> resultados
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4">
          {/* Page Size Selector */}
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Linhas por página</p>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => {
                setPageSize(Number(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={pageSize.toString()} />
              </SelectTrigger>
              <SelectContent side="top">
                {[5, 10, 20, 50, 100].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Page Navigation */}
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Primeira página</span>
                <DoubleArrowLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <span className="sr-only">Página anterior</span>
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Próxima página</span>
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
              >
                <span className="sr-only">Última página</span>
                <DoubleArrowRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

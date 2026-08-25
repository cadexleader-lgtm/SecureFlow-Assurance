import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, Eye, Calendar } from "lucide-react";
import type { ActionLog } from "@shared/schema";

interface LogsResponse {
  logs: ActionLog[];
  total: number;
  page: number;
  limit: number;
}

export default function ActionLogs() {
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading } = useQuery<LogsResponse>({
    queryKey: ["/api/admin/logs", currentPage],
    queryFn: async () => {
      const res = await fetch(`/api/admin/logs?page=${currentPage}&limit=50`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Erreur lors du chargement des logs");
      return res.json();
    },
  });

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const truncateText = (text: string | null, maxLength = 60) => {
    if (!text) return "-";
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const formatDetails = (details: string | null) => {
    if (!details) return "-";
    try {
      return JSON.stringify(JSON.parse(details), null, 2);
    } catch {
      return details;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-action-logs-title">
          Historique des Actions
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultez l'historique complet des actions effectuees dans le systeme
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Journal des actions
          </CardTitle>
          {data && (
            <span className="text-sm text-muted-foreground" data-testid="text-total-logs">
              {data.total} action(s) au total
            </span>
          )}
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : data && data.logs.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Heure</TableHead>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.logs.map((log) => (
                    <TableRow key={log.id} data-testid={`log-row-${log.id}`}>
                      <TableCell className="whitespace-nowrap text-sm" data-testid={`text-log-date-${log.id}`}>
                        {new Date(log.createdAt).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="font-medium" data-testid={`text-log-user-${log.id}`}>
                        {log.userName}
                      </TableCell>
                      <TableCell data-testid={`text-log-action-${log.id}`}>
                        {log.action}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground truncate max-w-[200px]" data-testid={`text-log-details-${log.id}`}>
                            {truncateText(log.details)}
                          </span>
                          {log.details && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-view-details-${log.id}`}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-lg">
                                <DialogHeader>
                                  <DialogTitle>Details de l'action</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <span className="text-muted-foreground">Date:</span>
                                    <span>{new Date(log.createdAt).toLocaleString("fr-FR")}</span>
                                    <span className="text-muted-foreground">Utilisateur:</span>
                                    <span>{log.userName}</span>
                                    <span className="text-muted-foreground">Action:</span>
                                    <span>{log.action}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-1">Details complets:</p>
                                    <pre className="bg-muted p-3 rounded-md text-xs overflow-auto max-h-[300px] whitespace-pre-wrap">
                                      {formatDetails(log.details)}
                                    </pre>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-page-info">
                  Page {data.page} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Precedent
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={currentPage >= totalPages}
                    data-testid="button-next-page"
                  >
                    Suivant
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              Aucun log disponible
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

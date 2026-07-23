import { AccountShell } from "../components/AccountShell";
import { Card, CardBody, CardHeader } from "../components/ui/Card";
import { DataTable } from "../components/ui/DataTable";
import { EmptyState } from "../components/ui/EmptyState";
import { useLocale } from "../locale";
import {
  DEMO_I_REGISTER,
  DEMO_REGISTER_ME,
  type LinkedShooter,
} from "../lib/linkedShootersDemo";

/** «Пов’язані стрільці» — two Gentelella-style tables on mock data. */
export function LinkedShootersPage() {
  const { t } = useLocale();

  const columns = [
    {
      key: "nickname",
      header: t.linkedColNickname,
      cell: (row: LinkedShooter) => row.nickname,
    },
    {
      key: "name",
      header: t.linkedColName,
      cell: (row: LinkedShooter) => row.fullName,
    },
    {
      key: "phone",
      header: t.linkedColPhone,
      cell: (row: LinkedShooter) => row.phoneMasked,
    },
  ] as const;

  return (
    <AccountShell>
      <div className="stack">
        <Card>
          <CardHeader title={t.profileLinkedIRegister} />
          <CardBody flush>
            <DataTable
              columns={columns}
              rows={DEMO_I_REGISTER}
              rowKey={(row) => row.id}
              empty={
                <EmptyState title={t.linkedEmptyIRegister} description={t.profileMatchesComingSoon} />
              }
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t.profileLinkedRegisterMe} />
          <CardBody flush>
            <DataTable
              columns={columns}
              rows={DEMO_REGISTER_ME}
              rowKey={(row) => row.id}
              empty={
                <EmptyState title={t.linkedEmptyRegisterMe} description={t.profileMatchesComingSoon} />
              }
            />
          </CardBody>
        </Card>
      </div>
    </AccountShell>
  );
}

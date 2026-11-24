import { PublicProfile } from "./PublicProfile"

interface PageProps {
  params: Promise<{ addr: string }>
}

export default async function ProfilePage({ params }: PageProps) {
  const { addr } = await params
  return <PublicProfile key={addr} addr={addr} />
}

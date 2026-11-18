import ConversationList from "@/components/dashboard/ConversationList";
import { PageTitle } from "@/components/dashboard/SectionHeader";
import { getDesk } from "@/lib/dashboard/getDesk";

export const instant = false;
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const desk = await getDesk();

  return (
    <>
      <PageTitle title="Inbox" description="Every customer question, newest first. Open a row to read the thread and see which source each reply used." />
      <div className="border border-rule bg-paper px-4 pb-1 sm:px-5">
        <ConversationList conversations={desk.conversations} />
      </div>
    </>
  );
}

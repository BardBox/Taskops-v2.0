import { MainLayout } from "@/components/MainLayout";
import CommandPost from "@/components/hive/CommandPost";
import BirthdayWall from "@/components/hive/BirthdayWall";
import HallOfFame from "@/components/hive/HallOfFame";
import TeamChat from "@/components/hive/TeamChat";

const TheHive = () => {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <span className="text-4xl">🐝</span>
          <div>
            <h1 className="text-3xl font-bold text-foreground">The Creative Hive</h1>
            <p className="text-muted-foreground">Team communication & celebration center</p>
          </div>
        </div>

        {/* Command Post - Full Width */}
        <CommandPost />

        {/* Birthday Wall & Hall of Fame - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BirthdayWall />
          <HallOfFame />
        </div>

        {/* Team Chat - Full Width */}
        <TeamChat />
      </div>
    </MainLayout>
  );
};

export default TheHive;

import { View } from "react-native";
import { useCol } from "@/lib/store";
import { dayDiff, dayLabel, todayKey } from "@/lib/dates";
import { memberName, nextCountdown } from "@/lib/family";
import type { Countdown, Member } from "@/lib/types";
import { T } from "@/ui/kit";
import { EntList } from "@/ui/EntList";
import { MEMBER, useColors } from "@/ui/theme";

export default function Countdowns() {
  const members = useCol<Member>("members"), c = useColors(), k = todayKey();
  return (
    <EntList<Countdown> title="Countdowns" kind="countdown" col="countdowns" add="Add countdown" filter={x => !!(x.title && x.date)}
      empty={{ title: "Nothing to count down to yet", body: "Birthdays, trips, the last day of school. Kids love seeing the days tick down." }}
      groups={list => {
        const withNext = list.map(x => ({ x, d: nextCountdown(x, k) }));
        return [
          { title: "Coming up", items: withNext.filter(o => o.d >= k).sort((a, b) => a.d.localeCompare(b.d)).map(o => o.x) },
          { title: "Past", items: withNext.filter(o => o.d < k).sort((a, b) => b.d.localeCompare(a.d)).map(o => o.x) },
        ];
      }}
      row={x => {
        const d = nextCountdown(x, k), n = dayDiff(k, d);
        return {
          title: x.title,
          sub: [dayLabel(d), x.member && x.member !== "all" ? memberName(members, x.member) : "", x.yearly ? "Every year" : ""].filter(Boolean).join(" · "),
          left: <View style={{ width: 10, height: 34, borderRadius: 5, backgroundColor: MEMBER.dot[x.tone || "sage"] || c.sageBtn }} />,
          right: n >= 0 ? <T weight="semibold" color={c.sageInk}>{n === 0 ? "Today!" : n === 1 ? "1 day" : `${n} days`}</T> : null,
        };
      }} />
  );
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export type EventRow = {
  id: string;
  title: string;
  host: string;
  place: string;
  date_text: string;
  description: string;
  tags: string[];
  hue: number;
  vip: boolean;
  cover_key: string | null;
  base_going: number;
  base_interested: number;
};

export type AttendeeRow = {
  id: string;
  event_id: string;
  user_id: string;
  status: string;
};

export type AttendStatus = "none" | "going" | "interested";

export function useEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [e, a] = await Promise.all([
      supabase.from("events").select("*").order("created_at", { ascending: true }),
      supabase.from("event_attendees").select("id, event_id, user_id, status"),
    ]);
    setEvents((e.data ?? []) as EventRow[]);
    setAttendees((a.data ?? []) as AttendeeRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const countFor = (ev: EventRow, status: "going" | "interested") =>
    (status === "going" ? ev.base_going : ev.base_interested) +
    attendees.filter((a) => a.event_id === ev.id && a.status === status).length;

  const myStatus = (eventId: string): AttendStatus => {
    if (!user) return "none";
    const row = attendees.find((a) => a.event_id === eventId && a.user_id === user.id);
    return (row?.status as AttendStatus) ?? "none";
  };

  const setStatus = async (eventId: string, next: "going" | "interested") => {
    if (!user) return;
    const existing = attendees.find((a) => a.event_id === eventId && a.user_id === user.id);
    if (existing && existing.status === next) {
      setAttendees((list) => list.filter((a) => a.id !== existing.id));
      await supabase.from("event_attendees").delete().eq("id", existing.id);
      return;
    }
    if (existing) {
      setAttendees((list) => list.map((a) => (a.id === existing.id ? { ...a, status: next } : a)));
      await supabase.from("event_attendees").update({ status: next }).eq("id", existing.id);
      return;
    }
    const { data } = await supabase
      .from("event_attendees")
      .insert({ event_id: eventId, user_id: user.id, status: next })
      .select("id, event_id, user_id, status")
      .single();
    if (data) setAttendees((list) => [...list, data as AttendeeRow]);
  };

  const attendeeIds = (eventId: string, status?: "going" | "interested") =>
    attendees
      .filter((a) => a.event_id === eventId && (!status || a.status === status))
      .map((a) => a.user_id);

  return { events, attendees, loading, refresh, countFor, myStatus, setStatus, attendeeIds };
}

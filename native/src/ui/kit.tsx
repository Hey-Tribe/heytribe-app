// The HeyTribe building blocks. Every page is the same shape: a title, a row of soft pills for its sections,
// then rounded cards. One clear primary action per screen; everything else is quieter.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator, Animated, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text,
  TextInput, View, type PressableProps, type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { font, MEMBER, radius, space, useColors } from "./theme";
import { useColorScheme } from "react-native";

/* ---------- text ---------- */
type TProps = { children?: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; size?: number; weight?: keyof typeof font; numberOfLines?: number; center?: boolean; color?: string; strike?: boolean;
  onPress?: () => void; accessibilityLiveRegion?: "none" | "polite" | "assertive" };
export function T({ children, style, muted, size = 15.5, weight = "regular", numberOfLines, center, color, strike, onPress, accessibilityLiveRegion }: TProps) {
  const c = useColors();
  return (
    <Text numberOfLines={numberOfLines} maxFontSizeMultiplier={1.6} onPress={onPress} suppressHighlighting accessibilityRole={onPress ? "link" : undefined}
      accessibilityLiveRegion={accessibilityLiveRegion} role={accessibilityLiveRegion && accessibilityLiveRegion !== "none" ? "alert" : undefined}
      style={[{ fontFamily: font[weight], fontSize: size, lineHeight: Math.round(size * 1.35), color: color || (muted ? c.muted : c.ink) },
        center && { textAlign: "center" }, strike && { textDecorationLine: "line-through" }, style]}>
      {children}
    </Text>
  );
}
export const H2 = ({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) => (
  <View style={s.h2}><T size={16} weight="semibold" style={{ flex: 1 }}>{children}</T>{typeof right === "string" ? <T size={13} muted>{right}</T> : right}</View>
);

/* ---------- page: title + pills + content ---------- */
export type Pill<K extends string = string> = { key: K; label: string };
export function Pills<K extends string>({ items, value, onChange }: { items: Pill<K>[]; value: K; onChange: (k: K) => void }) {
  const c = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, flexShrink: 0 }} contentContainerStyle={s.pills} accessibilityRole="tablist">
      {items.map(p => {
        const on = p.key === value;
        return (
          <Pressable key={p.key} onPress={() => { if (!on) { Haptics.selectionAsync(); onChange(p.key); } }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} hitSlop={4}
            style={[s.pill, { backgroundColor: on ? c.pillOn : c.pill }]}>
            <T size={14} weight={on ? "semibold" : "medium"} color={on ? c.sageInk : c.muted}>{p.label}</T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Page({ title, pills, children, action, scroll = true, back }: {
  title: string; pills?: React.ReactNode; children: React.ReactNode; action?: React.ReactNode; scroll?: boolean; back?: React.ReactNode;
}) {
  const c = useColors(), insets = useSafeAreaInsets();
  const body = scroll
    ? <ScrollView contentContainerStyle={[s.content, { paddingBottom: 120 }]} keyboardShouldPersistTaps="handled">{children}</ScrollView>
    : <View style={[s.content, { flex: 1 }]}>{children}</View>;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ paddingTop: insets.top + (back ? 4 : 16), paddingHorizontal: space.gutter }}>
        {back}
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.3} style={{ fontFamily: font.bold, fontSize: 30, lineHeight: 34, color: c.ink, letterSpacing: -0.3 }}>{title}</Text>
      </View>
      {pills}
      {body}
      {action ? <View pointerEvents="box-none" style={[s.fabWrap, { bottom: 16 }]}>{action}</View> : null}
    </View>
  );
}

/* Fade content in when a pill switches: quick and quiet. */
export function Fade({ k, children }: { k: string; children: React.ReactNode }) {
  const o = useState(() => new Animated.Value(0))[0];
  useEffect(() => { o.setValue(0); Animated.timing(o, { toValue: 1, duration: 160, useNativeDriver: true }).start(); }, [k, o]);
  return <Animated.View style={{ opacity: o, gap: space.section }}>{children}</Animated.View>;
}

/* ---------- cards and rows ---------- */
export function Card({ children, style, pad = true }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; pad?: boolean }) {
  const c = useColors();
  return <View style={[s.card, { backgroundColor: c.surface, borderColor: c.hairline }, pad && { padding: space.card }, style]}>{children}</View>;
}
export function Rows({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const kids = React.Children.toArray(children).filter(Boolean);
  return (
    <Card pad={false}>
      {kids.map((k, i) => <View key={i} style={i ? { borderTopWidth: StyleSheet.hairlineWidth * 2, borderTopColor: c.hairline } : null}>{k}</View>)}
    </Card>
  );
}
export function Row({ title, sub, left, right, onPress, strike, onLongPress }: {
  title: string; sub?: string; left?: React.ReactNode; right?: React.ReactNode; onPress?: () => void; onLongPress?: () => void; strike?: boolean;
}) {
  const c = useColors();
  const inner = (
    <View style={s.row}>
      {left}
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight="medium" strike={strike} color={strike ? c.muted : undefined} numberOfLines={2}>{title}</T>
        {sub ? <T size={13} muted numberOfLines={2} style={{ marginTop: 2 }}>{sub}</T> : null}
      </View>
      {right}
    </View>
  );
  if (!onPress && !onLongPress) return inner;
  return <Pressable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" style={({ pressed }) => pressed && { backgroundColor: c.pill }}>{inner}</Pressable>;
}

/* Round tick used for chores, list items, routines and medicine doses. */
export function Check({ on, onPress, label }: { on: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Pressable onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onPress(); }} hitSlop={10}
      accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label} style={s.checkHit}>
      <View style={[s.check, { borderColor: on ? c.sageBtn : c.faint, backgroundColor: on ? c.sageBtn : "transparent" }]}>
        {on ? <T size={13} weight="bold" color="#fff">✓</T> : null}
      </View>
    </Pressable>
  );
}

export function Avatar({ name, color, size = 30 }: { name?: string; color?: string; size?: number }) {
  const scheme = useColorScheme() === "dark" ? "dark" : "light";
  const bg = MEMBER[scheme][color || "sage"] || MEMBER[scheme].sage;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: "center", justifyContent: "center" }} accessibilityLabel={name}>
      <T size={size * 0.42} weight="semibold">{(name || "?").trim().charAt(0).toUpperCase()}</T>
    </View>
  );
}

/* ---------- buttons ---------- */
type BtnProps = { label: string; onPress: () => void; kind?: "primary" | "secondary" | "danger" | "quiet"; busy?: boolean; disabled?: boolean; icon?: React.ReactNode; style?: StyleProp<ViewStyle> } & Pick<PressableProps, "accessibilityHint">;
export function Button({ label, onPress, kind = "primary", busy, disabled, icon, style, accessibilityHint }: BtnProps) {
  const c = useColors();
  const bg = kind === "primary" ? c.sageBtn : kind === "danger" ? c.danger : kind === "secondary" ? c.pill : "transparent";
  const fg = kind === "primary" || kind === "danger" ? "#fff" : kind === "quiet" ? c.sageInk : c.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityHint={accessibilityHint} accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>{icon}<T weight={kind === "primary" || kind === "danger" ? "semibold" : "medium"} color={fg}>{label}</T></View>}
    </Pressable>
  );
}
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.fab, { backgroundColor: c.sageBtn, opacity: pressed ? 0.9 : 1 }]}>
      <T size={20} weight="bold" color="#fff">+</T><T weight="semibold" color="#fff">{label}</T>
    </Pressable>
  );
}

/* ---------- empty state ---------- */
export function Empty({ title, body, action }: { title: string; body: string; action?: { label: string; onPress: () => void } }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: 32, gap: 8 }}>
      <T size={18} weight="semibold" center>{title}</T>
      <T muted center style={{ maxWidth: 280 }}>{body}</T>
      {action ? <Button label={action.label} icon="+" onPress={action.onPress} style={{ marginTop: 12, alignSelf: "center", paddingHorizontal: 22 }} /> : null}
    </Card>
  );
}
export function Loading() {
  const c = useColors();
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: c.bg }}><ActivityIndicator color={c.sage} /></View>;
}

/* ---------- forms ---------- */
export function Field({ label, ...p }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 6 }}>
      <T size={13} weight="medium" muted>{label}</T>
      <TextInput placeholderTextColor={c.faint} accessibilityLabel={label} maxFontSizeMultiplier={1.6} {...p}
        style={[s.input, { borderColor: c.line, color: c.ink, backgroundColor: c.surface }, p.multiline && { minHeight: 90, textAlignVertical: "top", paddingTop: 12 }, p.style]} />
    </View>
  );
}
export function Choice<K extends string>({ label, items, value, onChange }: { label: string; items: Pill<K>[]; value: K; onChange: (k: K) => void }) {
  return <View style={{ gap: 6 }}><T size={13} weight="medium" muted>{label}</T><View style={{ marginHorizontal: -space.gutter }}><Pills items={items} value={value} onChange={onChange} /></View></View>;
}

/* ---------- bottom sheet ---------- */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const c = useColors(), insets = useSafeAreaInsets();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close"><View style={{ flex: 1, backgroundColor: "rgba(20,27,31,0.32)" }} /></Pressable>
        <View style={[s.sheet, { backgroundColor: c.surface, paddingBottom: insets.bottom + 20 }]} accessibilityViewIsModal>
          <View style={[s.grab, { backgroundColor: c.line }]} />
          <T size={20} weight="bold" style={{ marginBottom: 14 }}>{title}</T>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 14 }} style={{ maxHeight: 560 }}>{children}</ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* Ask before anything that can't be taken back. */
export function Confirm({ open, title, body, yes, onYes, onClose }: { open: boolean; title: string; body: string; yes: string; onYes: () => void; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <T muted>{body}</T>
      <Button label={yes} kind="danger" onPress={() => { onClose(); onYes(); }} />
      <Button label="Keep it" kind="secondary" onPress={onClose} />
    </Sheet>
  );
}

/* ---------- toast with undo ---------- */
type ToastMsg = { text: string; undo?: () => void };
const ToastCtx = createContext<(m: ToastMsg) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const c = useColors(), insets = useSafeAreaInsets();
  const [msg, setMsg] = useState<ToastMsg | null>(null);
  const o = useState(() => new Animated.Value(0))[0], timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: ToastMsg) => {
    if (timer.current) clearTimeout(timer.current);
    setMsg(m); Animated.timing(o, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    timer.current = setTimeout(() => Animated.timing(o, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => setMsg(null)), m.undo ? 5000 : 2600);
  }, [o]);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg ? (
        <Animated.View accessibilityLiveRegion="polite" style={[s.toast, { opacity: o, backgroundColor: c.toast, bottom: insets.bottom + 92 }]}>
          <T color={c.bg} style={{ flex: 1 }}>{msg.text}</T>
          {msg.undo ? <Pressable onPress={() => { msg.undo!(); setMsg(null); }} accessibilityRole="button" style={s.undo}><T weight="semibold" color={c.bg}>Undo</T></Pressable> : null}
        </Animated.View>
      ) : null}
    </ToastCtx.Provider>
  );
}

const s = StyleSheet.create({
  h2: { flexDirection: "row", alignItems: "baseline", paddingHorizontal: 4, marginBottom: 10 },
  pills: { gap: 8, paddingHorizontal: space.gutter, paddingTop: 14, paddingBottom: 4 },
  pill: { height: 36, paddingHorizontal: 15, borderRadius: radius.pill, justifyContent: "center" },
  content: { paddingHorizontal: space.gutter, paddingTop: 16, gap: space.section },
  card: { borderRadius: radius.card, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, paddingLeft: 14, paddingRight: 14, minHeight: 60 },
  checkHit: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.75, alignItems: "center", justifyContent: "center" },
  btn: { minHeight: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  fabWrap: { position: "absolute", right: space.gutter },
  fab: { flexDirection: "row", gap: 8, alignItems: "center", height: 50, paddingLeft: 18, paddingRight: 22, borderRadius: radius.pill, shadowColor: "#2F3B45", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  input: { borderWidth: 1, borderRadius: radius.input, minHeight: 48, paddingHorizontal: 14, fontFamily: font.regular, fontSize: 16 },
  sheet: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingHorizontal: 24, paddingTop: 10 },
  grab: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 14 },
  toast: { position: "absolute", left: 16, right: 16, minHeight: 54, borderRadius: 16, paddingLeft: 18, paddingRight: 8, flexDirection: "row", alignItems: "center", gap: 12 },
  undo: { height: 40, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: "rgba(255,255,255,0.14)", justifyContent: "center" },
});

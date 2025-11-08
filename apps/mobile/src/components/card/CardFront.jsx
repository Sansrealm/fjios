import React, { useMemo, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  Share,
  Linking,
  ActivityIndicator,
  AppState,
} from "react-native"; // added Share for inline share button
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useIsFocused } from "@react-navigation/native";

function normalizeVideoUrl(url) {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("ucarecdn.com")) return url;
    const path = u.pathname.endsWith("/") ? u.pathname : `${u.pathname}/`;
    if (!path.includes("/video/")) {
      u.pathname = `${path}video/-/format/mp4/-/progressive/yes/-/inline/yes/`;
    } else if (!path.includes("-/format/mp4/")) {
      u.pathname = path.replace("/video/", "/video/-/format/mp4/");
      if (!u.pathname.includes("-/progressive/yes/")) {
        u.pathname = `${u.pathname}-/progressive/yes/`;
      }
      if (!u.pathname.includes("-/inline/yes/")) {
        u.pathname = `${u.pathname}-/inline/yes/`;
      }
    } else {
      let p = path;
      if (!p.includes("-/progressive/yes/")) {
        p = `${p}-/progressive/yes/`;
      }
      if (!p.includes("-/inline/yes/")) {
        p = `${p}-/inline/yes/`;
      }
      u.pathname = p;
    }
    return u.toString();
  } catch (_) {
    return url;
  }
}

export default function CardFront({
  card,
  handleFlipToAsk,
  isAuthenticated,
  isOwner,
  onAddAsk,
  // NEW: pause front video when the card is flipped to back
  pauseVideo = false,
  // NEW: inline edit action next to the user's name
  onEdit,
  // NEW: optional share handler to expose a minimal share icon inline with the name
  onShare,
  // NEW: optional onScroll to drive header effects
  onScroll,
}) {
  // Precompute ask items with display titles to avoid complex JSX expressions
  const displayedAsks = useMemo(() => {
    const list = Array.isArray(card?.asks) ? card.asks : [];
    return list.map((ask, idx) => {
      const rawTitle = (ask?.title || "").trim();
      const cleanedTitle =
        rawTitle && rawTitle.toLowerCase() !== "video ask"
          ? rawTitle
          : (ask?.description || "").trim().slice(0, 40) || `Ask ${idx + 1}`;
      return { ...ask, displayTitle: cleanedTitle };
    });
  }, [card?.asks]);

  // Compute a clean hostname for website display
  const websiteHost = useMemo(() => {
    const raw = card?.startup_website || "";
    try {
      const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
      return u.hostname.replace(/^www\./, "");
    } catch (_) {
      return raw.replace(/^https?:\/\//, "").replace(/\/$/, "");
    }
  }, [card?.startup_website]);

  // ADD: Compute a compact location string
  const locationLine = useMemo(() => {
    const parts = [
      card?.location_city,
      card?.location_state,
      card?.location_country,
    ]
      .map((p) => (p || "").trim())
      .filter(Boolean);
    return parts.join(", ");
  }, [card?.location_city, card?.location_state, card?.location_country]);

  // Move profile video player into a child so hooks aren't called when URL is missing
  const ProfileVideo = ({ url, paused }) => {
    const isScreenFocused = useIsFocused();
    const [appState, setAppState] = useState(AppState.currentState);
    const [isLoading, setIsLoading] = useState(true);
    const [hasAutoPlayed, setHasAutoPlayed] = useState(false);
    const [playRequested, setPlayRequested] = useState(false);
    const normalizedUrl = useMemo(() => normalizeVideoUrl(url), [url]);
    const player = useVideoPlayer(normalizedUrl, (p) => {
      p.loop = false; // play once
      p.muted = false;
    });

    // Track app foreground/background
    useEffect(() => {
      const sub = AppState.addEventListener("change", setAppState);
      return () => sub?.remove?.();
    }, []);

    // Autoplay exactly once when first focused and visible
    useEffect(() => {
      if (!normalizedUrl) return;
      if (
        !hasAutoPlayed &&
        isScreenFocused &&
        appState === "active" &&
        !paused
      ) {
        setPlayRequested(true);
        setHasAutoPlayed(true);
      }
    }, [normalizedUrl, hasAutoPlayed, isScreenFocused, appState, paused]);

    // Enforce strict focus-based playback
    const shouldPlay =
      playRequested &&
      isScreenFocused &&
      appState === "active" &&
      !paused &&
      !isLoading;
    useEffect(() => {
      if (!normalizedUrl) return;
      try {
        if (shouldPlay) {
          player.play();
        } else {
          player.pause();
        }
      } catch (e) {}
    }, [normalizedUrl, shouldPlay, player]);

    return (
      <View
        style={{
          height: 280,
          borderRadius: 16,
          overflow: "hidden",
          backgroundColor: "#000",
          margin: 16,
          marginBottom: 8,
        }}
      >
        {/* Loader overlay until first frame renders */}
        {isLoading && (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2,
              backgroundColor: "rgba(0,0,0,0.2)",
            }}
          >
            <ActivityIndicator size="large" color="#8FAEA2" />
          </View>
        )}
        <VideoView
          key={normalizedUrl}
          player={player}
          allowsFullscreen={false}
          nativeControls={true}
          style={{ flex: 1 }}
          onFirstFrameRender={() => setIsLoading(false)}
        />
        {/* Subtle gradient at bottom */}
        <LinearGradient
          colors={["transparent", "rgba(13,13,13,0.3)", "rgba(13,13,13,0.7)"]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 80,
          }}
        />
        {/* Tap overlay to request play when not actively playing */}
        {!shouldPlay && !isLoading && (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setPlayRequested(true)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.15)",
            }}
          >
            <Ionicons name="play-circle" size={64} color="#8FAEA2" />
            <Text
              style={{
                color: "#E5E5E5",
                fontFamily: "Inter_500Medium",
                fontSize: 14,
                marginTop: 8,
              }}
            >
              Tap to play
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <LinearGradient
      colors={["#1A1A1A", "#0D0D0D"]}
      style={{ flex: 1, padding: 0 }}
    >
      {/* CHANGE: Make entire face a single scroll layer so video + content move together */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Profile Video at top inside the same scroll layer */}
        {card.profile_video_url ? (
          <ProfileVideo url={card.profile_video_url} paused={pauseVideo} />
        ) : null}

        {/* Content Section (no separate layer) */}
        <View style={{ paddingHorizontal: 24 }}>
          {/* Profile Info */}
          <View>
            {/* Name row with optional inline edit icon for owners */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <Text
                style={{
                  color: "#FFF",
                  fontFamily: "Inter_700Bold",
                  fontSize: 28,
                  letterSpacing: -0.5,
                  flex: 1,
                }}
              >
                {card.name}
              </Text>
              {/* Always show share; if onShare is not provided, build a default link */}
              <TouchableOpacity
                onPress={() => {
                  try {
                    if (onShare) {
                      onShare();
                      return;
                    }
                    const slugOrId = card?.slug ? card.slug : String(card?.id);
                    const base =
                      process.env.EXPO_PUBLIC_BASE_URL ||
                      process.env.APP_URL ||
                      process.env.EXPO_PUBLIC_HOST ||
                      "";
                    const url = base
                      ? `${base}/card/${slugOrId}`
                      : `https://createanything.com/card/${slugOrId}`;
                    Share.share({
                      title: `${card?.name}'s card`,
                      message: `${card?.name}'s card: ${url}`,
                      url,
                    });
                  } catch (e) {
                    console.error(e);
                    Alert.alert("Error", "Could not open share options");
                  }
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                style={{ marginLeft: 12 }}
              >
                <Ionicons name="share-outline" size={20} color="#8FAEA2" />
              </TouchableOpacity>
              {isOwner && onEdit && (
                <TouchableOpacity
                  onPress={onEdit}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{ marginLeft: 12 }}
                >
                  <Ionicons name="create-outline" size={20} color="#8FAEA2" />
                </TouchableOpacity>
              )}
            </View>

            {card.startup_name && (
              <Text
                style={{
                  color: "#8FAEA2",
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 18,
                  marginBottom: 4,
                }}
              >
                {card.startup_name}
              </Text>
            )}

            {/* Role + Website inline row */}
            {(card.role || websiteHost) && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  marginBottom: 6,
                }}
              >
                {card.role ? (
                  <Text
                    style={{
                      color: "#CFCFCF",
                      fontFamily: "Inter_500Medium",
                      fontSize: 16,
                    }}
                  >
                    {card.role}
                  </Text>
                ) : null}
                {card.role && websiteHost ? (
                  <Text style={{ color: "#5A5A5A", marginHorizontal: 6 }}>
                    •
                  </Text>
                ) : null}
                {websiteHost ? (
                  <TouchableOpacity
                    onPress={() => {
                      const url = card?.startup_website;
                      if (!url) return;
                      try {
                        const open = url.startsWith("http")
                          ? url
                          : `https://${url}`;
                        Linking.openURL(open);
                      } catch (_) {}
                    }}
                  >
                    <Text
                      style={{
                        color: "#9FC3B9",
                        fontFamily: "Inter_500Medium",
                        fontSize: 13, // smaller font for website per reference
                        textDecorationLine: "underline",
                      }}
                    >
                      {websiteHost}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}

            {/* ADD: Location line */}
            {!!locationLine && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <Ionicons name="location-outline" size={16} color="#8FAEA2" />
                <Text
                  style={{
                    color: "#8FAEA2",
                    fontFamily: "Inter_500Medium",
                    fontSize: 13,
                    marginLeft: 6,
                  }}
                >
                  {locationLine}
                </Text>
              </View>
            )}

            {card.description && (
              <Text
                style={{
                  color: "#E5E5E5",
                  fontFamily: "Inter_400Regular",
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 16,
                }}
              >
                {card.description}
              </Text>
            )}

            {/* Industry Tags */}
            {card.industry_tags && card.industry_tags.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  marginBottom: 20,
                }}
              >
                {card.industry_tags.map((tag) => (
                  <View
                    key={tag.id}
                    style={{
                      backgroundColor: `${tag.color}25`,
                      borderWidth: 1,
                      borderColor: `${tag.color}80`,
                      borderRadius: 16,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      marginRight: 8,
                      marginBottom: 8,
                    }}
                  >
                    <Text
                      style={{
                        color: tag.color,
                        fontFamily: "Inter_500Medium",
                        fontSize: 13,
                      }}
                    >
                      {tag.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Ask Buttons & Owner Action */}
          <View style={{ marginBottom: 12 }}>
            {displayedAsks.length > 0 && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    color: "#8FAEA2",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    marginBottom: 8,
                  }}
                >
                  Current Asks
                </Text>
                {displayedAsks.map((ask) => (
                  <TouchableOpacity
                    key={ask.id}
                    onPress={() => handleFlipToAsk && handleFlipToAsk(ask)}
                    style={{
                      backgroundColor: "rgba(143, 174, 162, 0.15)",
                      borderWidth: 1,
                      borderColor: "#8FAEA2",
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: "#8FAEA2",
                        fontFamily: "Inter_600SemiBold",
                        fontSize: 15,
                        flex: 1,
                      }}
                    >
                      {ask.displayTitle}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#8FAEA2"
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Only owners see Add an Ask on the front if a handler is provided; no message button on front for anyone */}
            {isOwner && onAddAsk && (
              <TouchableOpacity
                onPress={onAddAsk}
                style={{
                  backgroundColor: "#8FAEA2",
                  borderRadius: 12,
                  paddingVertical: 16,
                  alignItems: "center",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="add-circle" size={20} color="#000" />
                <Text
                  style={{
                    color: "#000",
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 16,
                    marginLeft: 8,
                  }}
                >
                  Add an Ask
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

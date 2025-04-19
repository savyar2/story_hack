import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Maximize, RefreshCw, Search, Sun, Play } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

// Define the Track interface matching Spotify API response
interface Track {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    name: string;
    images: { url: string }[];
  };
  duration_ms: number;
}

export default function LimeDashboard({ 
  initialCategory = "spotify", 
  initialIsAuthenticated = false 
}) {
  console.log('[DEBUG] <LimeDashboard> rendered with:', { initialCategory, initialIsAuthenticated });
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState({
    show: false,
    message: "",
    type: "",
  });
  const [isAuthenticated, setIsAuthenticated] = useState(initialIsAuthenticated);
  console.log('[DEBUG] isAuthenticated state:', isAuthenticated);

  const spotifyIntegrations = [
    { id: 1, title: "New Releases", description: "Discover the latest releases." },
    { id: 2, title: "Top Charts", description: "Browse the top charts." },
    { id: 3, title: "My Library", description: "Access your personal library." },
    { id: 4, title: "Genre Explorer", description: "Explore music by genre." },
  ];

  const licenseIntegrations = [
    { id: 1, title: "My Licenses", description: "View your licenses." },
    { id: 2, title: "License Marketplace", description: "Browse license terms." },
    { id: 3, title: "Revenue Dashboard", description: "Track revenue from licenses." },
    { id: 4, title: "License Wizard", description: "Get help choosing a license." },
  ];

  const checkAuthentication = useCallback(async () => {
    console.log('[DEBUG] checkAuthentication called');
    if (typeof window !== 'undefined' && window.INITIAL_STATE?.isAuthenticated) {
      console.log('[DEBUG] window.INITIAL_STATE indicates authentication true');
      setIsAuthenticated(true);
      return true;
    }
    try {
      const response = await fetch('/api/token-status');
      if (!response.ok) {
        console.log('[DEBUG] /api/token-status response not OK:', response.status);
        setIsAuthenticated(false);
        return false;
      }
      const data = await response.json();
      console.log('[DEBUG] /api/token-status data:', data);
      setIsAuthenticated(data.isValid);
      return data.isValid;
    } catch (error) {
      console.error('[DEBUG] Error in checkAuthentication:', error);
      setIsAuthenticated(false);
      return false;
    }
  }, []);

  const fetchTracks = useCallback(async () => {
    console.log('[DEBUG] fetchTracks called');
    setLoading(true);
    const isAuth = await checkAuthentication();
    console.log('[DEBUG] checkAuthentication returned:', isAuth);
    if (!isAuth) {
      console.log('[DEBUG] Not authenticated, cannot fetch tracks');
      setNotification({
        show: true,
        message: "Please log in with Spotify first",
        type: "error",
      });
      setLoading(false);
      return;
    }
    try {
      console.log('[DEBUG] Fetching /api/top-tracks...');
      const response = await fetch("/api/top-tracks");
      if (response.ok) {
        const data = await response.json();
        console.log('[DEBUG] Received tracks:', data);
        setTracks(data.items || []);
      } else {
        const errorText = await response.text();
        console.error('[DEBUG] Error response from /api/top-tracks:', response.status, errorText);
        if (response.status === 401) {
          setNotification({
            show: true,
            message: "Please log in with Spotify to view your top tracks",
            type: "error",
          });
        } else {
          setNotification({
            show: true,
            message: "Failed to load your Spotify tracks. Please try again.",
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error('[DEBUG] Error fetching tracks:', error);
      setNotification({
        show: true,
        message: "Network error while loading tracks",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [checkAuthentication]);

  useEffect(() => {
    console.log('[DEBUG] useEffect: checking authentication on mount');
    checkAuthentication();
  }, [checkAuthentication]);

  useEffect(() => {
    console.log('[DEBUG] useEffect: selectedCategory changed to', selectedCategory);
    if (selectedCategory === "spotify") {
      console.log('[DEBUG] selectedCategory is spotify, calling fetchTracks');
      fetchTracks();
    }
  }, [selectedCategory, fetchTracks]);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  const handleLicenseTrack = async (track: Track) => {
    console.log('[DEBUG] Licensing track:', track.id, track.name);
    try {
      const response = await fetch("/log-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: track.id,
          name: track.name,
          artist: track.artists[0]?.name || "Unknown Artist",
          album: track.album.name,
          image_url: track.album.images[0]?.url || "",
          duration_ms: track.duration_ms,
          release_date: new Date().toISOString().split("T")[0],
          popularity: 50,
          title: track.name,
        }),
      });
      if (response.ok) {
        console.log('[DEBUG] Track licensed successfully:', track.id);
        setNotification({
          show: true,
          message: `Successfully licensed "${track.name}" by ${track.artists[0]?.name || "Unknown Artist"}`,
          type: "success",
        });
      } else {
        const errorText = await response.text();
        console.error('[DEBUG] Error response from /log-metadata:', errorText);
        setNotification({
          show: true,
          message: "There was an error licensing this track",
          type: "error",
        });
      }
    } catch (error) {
      console.error('[DEBUG] Error in handleLicenseTrack:', error);
      setNotification({
        show: true,
        message: "There was an error licensing this track",
        type: "error",
      });
    }
  };

  const handleLogin = () => {
    console.log('[DEBUG] handleLogin called, redirecting to /login');
    window.location.href = "/login";
  };

  console.log('[DEBUG] Rendering LimeDashboard component...');
  return (
    <div className="flex h-screen flex-col">
      {/* Top navigation bar */}
      <div className="flex h-12 items-center gap-2 border-b bg-background px-4">
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" data-action="reload">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <div className="relative flex-1 max-w-2xl mx-auto">
          <div className="flex h-9 w-full items-center rounded-full border bg-muted/50 px-4">
            <span className="text-sm text-muted-foreground">/LiMe</span>
          </div>
        </div>
        {!isAuthenticated && (
          <Button variant="outline" size="sm" onClick={handleLogin} data-action="login">
            Login with Spotify
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Sun className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <div className="h-4 w-4 border border-current rounded" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Maximize className="h-4 w-4" />
        </Button>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-60 border-r bg-background">
          <div className="p-6">
            <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          </div>
          <div className="space-y-1 px-3">
            <Button
              variant={selectedCategory === "spotify" ? "secondary" : "ghost"}
              className="w-full justify-start font-medium"
              onClick={() => {
                console.log('[DEBUG] Sidebar clicked: spotify');
                setSelectedCategory("spotify");
              }}
            >
              Spotify Tracks
            </Button>
            <Button
              variant={selectedCategory === "licenses" ? "secondary" : "ghost"}
              className="w-full justify-start font-medium"
              onClick={() => {
                console.log('[DEBUG] Sidebar clicked: licenses');
                setSelectedCategory("licenses");
              }}
            >
              Licenses
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto bg-muted/20">
          <div className="p-6">
            <h1 className="text-3xl font-bold tracking-tight">LiMe</h1>
            <div className="mt-6">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search integrations..." className="pl-9 bg-background" />
              </div>
            </div>
            <h2 className="text-xl font-semibold mt-4">
              {selectedCategory === "spotify" ? "Spotify Tracks" : "Licenses"}
            </h2>

            {selectedCategory === "spotify" ? (
              <>
                {!isAuthenticated ? (
                  <div className="flex flex-col items-center justify-center h-64 mt-6">
                    <p className="mb-4">Please log in with Spotify to view your top tracks</p>
                    <Button onClick={handleLogin} data-action="login">
                      Login with Spotify
                    </Button>
                  </div>
                ) : (
                  loading ? (
                    <div className="flex justify-center items-center h-64">
                      <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                    </div>
                  ) : tracks.length > 0 ? (
                    <div className="mt-6 bg-white rounded-lg shadow">
                      <div className="grid grid-cols-12 p-3 text-sm font-medium text-gray-500 border-b">
                        <div className="col-span-1"></div>
                        <div className="col-span-5">TITLE</div>
                        <div className="col-span-3">ALBUM</div>
                        <div className="col-span-2">DURATION</div>
                        <div className="col-span-1">LICENSE</div>
                      </div>
                      {tracks.map((track) => (
                        <div key={track.id} className="grid grid-cols-12 p-3 hover:bg-gray-50 items-center border-b">
                          <div className="col-span-1">
                            <div className="h-10 w-10 relative group">
                              <img
                                src={track.album.images[0]?.url || "https://via.placeholder.com/40"}
                                alt={track.album.name}
                                className="h-10 w-10 object-cover rounded"
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="h-5 w-5 text-white" />
                              </div>
                            </div>
                          </div>
                          <div className="col-span-5">
                            <div className="font-medium">{track.name}</div>
                            <div className="text-sm text-gray-500">
                              {track.artists.map(a => a.name).join(', ')}
                            </div>
                          </div>
                          <div className="col-span-3 truncate text-gray-500">{track.album.name}</div>
                          <div className="col-span-2 text-gray-500">{formatDuration(track.duration_ms)}</div>
                          <div className="col-span-1">
                            <Button size="sm" variant="outline" onClick={() => handleLicenseTrack(track)}>
                              License
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-64">
                      <p>No tracks found.</p>
                    </div>
                  )
                )}
              </>
            ) : (
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {licenseIntegrations.map((integration) => (
                  <div key={integration.id} className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                    <h3 className="text-lg font-semibold">{integration.title}</h3>
                    <p className="text-gray-500 mt-2">{integration.description}</p>
                    <Button className="mt-4" size="sm">
                      Explore
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded shadow-lg ${notification.type === "success" ? "bg-green-100 border-green-500" : "bg-red-100 border-red-500"}`}>
          <p>{notification.message}</p>
          <button className="absolute top-1 right-1 text-gray-500" onClick={() => setNotification({ ...notification, show: false })}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Modify to only access window in browser environment
if (typeof window !== 'undefined') {
  (window as any).LimeDashboard = LimeDashboard;
}

declare global {
  interface Window {
    INITIAL_STATE?: {
      isAuthenticated: boolean;
    };
  }
}

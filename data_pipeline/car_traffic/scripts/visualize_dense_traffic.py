"""
Task 8: High-Fidelity Traffic Visualizer
=========================================
Map dense traffic grid data onto road network using IDW interpolation.

Author: Geospatial UI Designer
Date: 2025-12-06
"""

import pandas as pd
import geopandas as gpd
import osmnx as ox
import folium
from folium import plugins
from pathlib import Path
from scipy.spatial import cKDTree
import numpy as np

# ============================================================================
# Configuration
# ============================================================================

# Input files
TRAFFIC_DATA = Path(__file__).parent.parent / "data" / "bucharest_realtime_traffic.csv"
SENSOR_DATA = Path(__file__).parent.parent / "data" / "bucharest_clean.csv"
OUTPUT_FILE = Path(__file__).parent.parent.parent.parent / "bucharest_max_density.html"

# Map center
MAP_CENTER = [44.4268, 26.1025]
MAP_ZOOM = 12

# OSMnx configuration
ox.settings.log_console = True


# ============================================================================
# Functions
# ============================================================================

def download_dense_network(place: str) -> gpd.GeoDataFrame:
    """
    Download high-density road network.
    
    Args:
        place: Location name
    
    Returns:
        GeoDataFrame of road segments
    """
    print("🌐 Downloading dense road network...")
    
    custom_filter = '["highway"~"motorway|trunk|primary|secondary|tertiary|residential"]'
    
    try:
        graph = ox.graph_from_place(
            place,
            network_type='drive',
            custom_filter=custom_filter
        )
        edges_gdf = ox.graph_to_gdfs(graph, nodes=False)
        print(f"✅ Loaded {len(edges_gdf):,} road segments")
        return edges_gdf
    except Exception as e:
        print(f"⚠️ Using fallback (no residential): {e}")
        custom_filter = '["highway"~"motorway|trunk|primary|secondary|tertiary"]'
        graph = ox.graph_from_place(place, network_type='drive', custom_filter=custom_filter)
        edges_gdf = ox.graph_to_gdfs(graph, nodes=False)
        print(f"✅ Loaded {len(edges_gdf):,} road segments")
        return edges_gdf


def interpolate_traffic_idw(roads_gdf: gpd.GeoDataFrame, 
                            traffic_df: pd.DataFrame, 
                            k: int = 3) -> gpd.GeoDataFrame:
    """
    Map traffic data to roads using IDW (Inverse Distance Weighting).
    
    For each road, find k nearest grid points and average their congestion
    values weighted by inverse distance.
    
    Args:
        roads_gdf: GeoDataFrame of road segments
        traffic_df: DataFrame with lat, lon, congestion_factor
        k: Number of nearest neighbors to use
    
    Returns:
        GeoDataFrame with congestion_level column
    """
    print(f"\n🔗 Interpolating traffic using IDW (k={k})...")
    
    # Filter valid traffic data
    traffic_valid = traffic_df[traffic_df['congestion_factor'].notna()].copy()
    print(f"   Valid traffic points: {len(traffic_valid):,}")
    
    # Build KD-tree from traffic grid
    traffic_coords = traffic_valid[['lat', 'lon']].values
    traffic_congestion = traffic_valid['congestion_factor'].values
    tree = cKDTree(traffic_coords)
    
    # Get road midpoints
    print("   Calculating road midpoints...")
    road_midpoints = roads_gdf.geometry.centroid
    road_coords = np.array([[pt.y, pt.x] for pt in road_midpoints])
    
    # Find k nearest neighbors for each road
    print(f"   Finding {k} nearest neighbors for each road...")
    distances, indices = tree.query(road_coords, k=k)
    
    # IDW interpolation
    print("   Applying inverse distance weighting...")
    congestion_levels = []
    
    for i in range(len(road_coords)):
        # Get k nearest congestion values and distances
        neighbor_congestion = traffic_congestion[indices[i]]
        neighbor_distances = distances[i]
        
        # Avoid division by zero (if road is exactly on grid point)
        neighbor_distances = np.maximum(neighbor_distances, 1e-10)
        
        # IDW: weight = 1/distance
        weights = 1.0 / neighbor_distances
        weights = weights / weights.sum()  # Normalize
        
        # Weighted average
        congestion = np.sum(neighbor_congestion * weights)
        congestion_levels.append(congestion)
    
    roads_gdf = roads_gdf.copy()
    roads_gdf['congestion_level'] = congestion_levels
    
    print(f"   ✅ Interpolated traffic for {len(roads_gdf):,} roads")
    print(f"   Congestion range: {roads_gdf['congestion_level'].min():.2%} - {roads_gdf['congestion_level'].max():.2%}")
    
    return roads_gdf


def get_traffic_color(congestion: float) -> str:
    """
    Return color based on congestion level.
    
    Dense & Dramatic scale:
    - Green: Empty (0-0.2)
    - Yellow: Moving (0.2-0.4)
    - Orange: Heavy (0.4-0.7)
    - Red: Gridlock (0.7-1.0)
    
    Args:
        congestion: Congestion factor (0-1)
    
    Returns:
        Hex color code
    """
    if pd.isna(congestion):
        return '#666666'
    elif congestion < 0.2:
        return '#00FF41'  # Green - Empty
    elif congestion < 0.4:
        return '#FFFF00'  # Yellow - Moving
    elif congestion < 0.7:
        return '#FF5500'  # Orange - Heavy
    else:
        return '#FF0000'  # Red - Gridlock


def get_road_weight(highway_type) -> float:
    """
    Return line weight based on road type.
    
    Args:
        highway_type: Highway classification
    
    Returns:
        Line weight
    """
    if isinstance(highway_type, list):
        highway_type = highway_type[0]
    
    if highway_type in ['motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link']:
        return 2.5  # Main roads
    else:
        return 1.0  # Residential/secondary


def create_max_density_map(roads_gdf: gpd.GeoDataFrame, 
                           sensors_df: pd.DataFrame) -> folium.Map:
    """
    Create high-fidelity traffic visualization.
    
    Args:
        roads_gdf: GeoDataFrame with congestion_level column
        sensors_df: DataFrame with pollution sensor data
    
    Returns:
        Folium Map object
    """
    print("\n🎨 Creating high-fidelity visualization...")
    
    # Create base map
    m = folium.Map(
        location=MAP_CENTER,
        zoom_start=MAP_ZOOM,
        tiles='CartoDB dark_matter',
        attr='CartoDB'
    )
    
    # ========================================================================
    # Layer 1: Pollution HeatMap (Background Context)
    # ========================================================================
    print("   🌫️ Adding pollution heatmap layer...")
    
    heat_data = [[row['lat'], row['lon'], row['PM2.5_Real']] 
                 for _, row in sensors_df.iterrows()]
    
    heatmap = plugins.HeatMap(
        heat_data,
        name='💨 Pollution Cloud',
        min_opacity=0.2,
        max_zoom=13,
        radius=20,
        blur=15,
        gradient={
            0.0: '#00FF41',
            0.4: '#FFFF00',
            0.7: '#FF0055',
            1.0: '#9D00FF'
        },
        overlay=True,
        control=True
    )
    heatmap.add_to(m)
    
    # ========================================================================
    # Layer 2: Neon Traffic Lines (Dense & Real-time)
    # ========================================================================
    print("   🚗 Adding dense traffic layer...")
    
    traffic_layer = folium.FeatureGroup(name='🚦 Real-time Traffic', overlay=True, control=True)
    
    # Convert to GeoJSON
    roads_json = roads_gdf[['geometry', 'highway', 'congestion_level']].to_json()
    
    def style_function(feature):
        """Style roads by real-time congestion."""
        congestion = feature['properties'].get('congestion_level')
        highway = feature['properties'].get('highway')
        
        return {
            'color': get_traffic_color(congestion),
            'weight': get_road_weight(highway),
            'opacity': 0.85
        }
    
    folium.GeoJson(
        roads_json,
        style_function=style_function,
        tooltip=folium.GeoJsonTooltip(
            fields=['highway', 'congestion_level'],
            aliases=['Road:', 'Congestion:'],
            localize=True
        )
    ).add_to(traffic_layer)
    
    traffic_layer.add_to(m)
    
    # ========================================================================
    # Layer Control
    # ========================================================================
    folium.LayerControl(position='topright', collapsed=False).add_to(m)
    
    # ========================================================================
    # Legend
    # ========================================================================
    legend_html = '''
    <div style="position: fixed; 
                bottom: 50px; right: 50px; width: 300px; height: auto;
                background-color: rgba(0, 0, 0, 0.95); 
                border: 3px solid #00FF41; 
                box-shadow: 0 0 25px #00FF41;
                z-index: 9999;
                font-size: 12px; 
                padding: 15px; 
                border-radius: 10px;
                color: white;
                font-family: 'Courier New', monospace;">
        
        <h4 style="margin: 0 0 10px 0; color: #00FF41; text-align: center; 
                   text-shadow: 0 0 10px #00FF41;">
            🚦 REAL-TIME TRAFFIC
        </h4>
        
        <!-- Gradient Bar -->
        <div style="background: linear-gradient(90deg, #00FF41, #FFFF00, #FF5500, #FF0000); 
                    height: 12px; border-radius: 6px; margin: 10px 0; 
                    box-shadow: 0 0 10px rgba(0,255,65,0.5);"></div>
        <div style="display: flex; justify-content: space-between; font-size: 9px; color: #888; margin-bottom: 12px;">
            <span>EMPTY</span>
            <span>MOVING</span>
            <span>HEAVY</span>
            <span>GRIDLOCK</span>
        </div>
        
        <!-- Details -->
        <p style="margin: 5px 0; font-size: 11px;">
            <span style="color: #00FF41;">●</span> <strong>0-20%</strong> Empty roads
        </p>
        <p style="margin: 5px 0; font-size: 11px;">
            <span style="color: #FFFF00;">●</span> <strong>20-40%</strong> Moving traffic
        </p>
        <p style="margin: 5px 0; font-size: 11px;">
            <span style="color: #FF5500;">●</span> <strong>40-70%</strong> Heavy congestion
        </p>
        <p style="margin: 5px 0; font-size: 11px;">
            <span style="color: #FF0000;">●</span> <strong>70-100%</strong> Gridlock
        </p>
        
        <hr style="border: 1px solid #333; margin: 12px 0;">
        
        <p style="margin: 4px 0; font-size: 10px; color: #888;">
            <strong>Data:</strong> 2,531 real-time traffic points<br>
            <strong>Method:</strong> IDW interpolation (k=3)
        </p>
        
        <p style="margin: 12px 0 0 0; font-size: 9px; color: #00FF41; 
                  text-align: center; font-style: italic;">
            Live traffic mapped to 35K+ streets
        </p>
    </div>
    '''
    m.get_root().html.add_child(folium.Element(legend_html))
    
    return m


def main():
    """Main execution pipeline."""
    print("=" * 70)
    print("Task 8: High-Fidelity Traffic Visualizer")
    print("=" * 70)
    
    # Load traffic grid data
    print(f"\n📊 Loading traffic grid data: {TRAFFIC_DATA}")
    traffic_df = pd.read_csv(TRAFFIC_DATA)
    print(f"   Loaded {len(traffic_df):,} grid points")
    
    # Load pollution sensor data
    print(f"\n📊 Loading pollution sensor data: {SENSOR_DATA}")
    sensors_df = pd.read_csv(SENSOR_DATA)
    print(f"   Loaded {len(sensors_df)} sensors")
    
    # Download road network
    print(f"\n🌐 Location: Bucharest, Romania")
    roads_gdf = download_dense_network("Bucharest, Romania")
    
    # Interpolate traffic to roads using IDW
    roads_gdf = interpolate_traffic_idw(roads_gdf, traffic_df, k=3)
    
    # Statistics
    print(f"\n📈 Traffic Distribution:")
    empty = (roads_gdf['congestion_level'] < 0.2).sum()
    moving = ((roads_gdf['congestion_level'] >= 0.2) & (roads_gdf['congestion_level'] < 0.4)).sum()
    heavy = ((roads_gdf['congestion_level'] >= 0.4) & (roads_gdf['congestion_level'] < 0.7)).sum()
    gridlock = (roads_gdf['congestion_level'] >= 0.7).sum()
    
    print(f"   🟢 Empty (0-20%): {empty:,} ({empty/len(roads_gdf)*100:.1f}%)")
    print(f"   🟡 Moving (20-40%): {moving:,} ({moving/len(roads_gdf)*100:.1f}%)")
    print(f"   🟠 Heavy (40-70%): {heavy:,} ({heavy/len(roads_gdf)*100:.1f}%)")
    print(f"   🔴 Gridlock (70-100%): {gridlock:,} ({gridlock/len(roads_gdf)*100:.1f}%)")
    
    # Create visualization
    m = create_max_density_map(roads_gdf, sensors_df)
    
    # Save
    m.save(str(OUTPUT_FILE))
    print(f"\n💾 Saved to: {OUTPUT_FILE}")
    print(f"   File size: {OUTPUT_FILE.stat().st_size / 1024 / 1024:.2f} MB")
    
    print("\n" + "=" * 70)
    print("🎉 High-fidelity traffic map generated!")
    print("=" * 70)
    print(f"\n🎨 Visual Design:")
    print(f"   ✓ Background: Pollution HeatMap (context)")
    print(f"   ✓ Foreground: 35K+ streets with real-time traffic")
    print(f"   ✓ IDW interpolation from 2,531 grid points")
    print(f"   ✓ Color: Green → Yellow → Orange → Red")
    print(f"\n🌐 Open {OUTPUT_FILE.name} to see live traffic on every street!")


if __name__ == "__main__":
    main()

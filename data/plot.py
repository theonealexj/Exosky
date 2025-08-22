#This code mounts Google Drive in Colab, loads a CSV of stellar data, 
# and visualizes stars in 3D. Star sizes reflect stellar radius, colors indicate star type, 
# and zoom with equal aspect ratio ensures accurate spatial representation, producing an interactive, 
# proportionally scaled 3D scatter plot of the stellar dataset.
from google.colab import drive
drive.mount('/content/gdrive')
import pandas as pd
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D

df = pd.read_csv("gdrive/MyDrive/NasaHack/HD 70642 b_stars_processed.csv")

fig = plt.figure(figsize=(12, 12))
ax = fig.add_subplot(111, projection='3d')

size_scale = 2.5  
df['star_size'] = df['stellar_radius'] * size_scale

sc = ax.scatter(df['x'], df['y'], df['z'],
                c=df['colour'],
                s=df['star_size'], alpha=0.7)

zoom_factor = 0.175  
x_mid, y_mid, z_mid = df['x'].mean(), df['y'].mean(), df['z'].mean()
x_range = (df['x'].max() - df['x'].min()) * zoom_factor
y_range = (df['y'].max() - df['y'].min()) * zoom_factor
z_range = (df['z'].max() - df['z'].min()) * zoom_factor

ax.set_xlim(x_mid - x_range/2, x_mid + x_range/2)
ax.set_ylim(y_mid - y_range/2, y_mid + y_range/2)
ax.set_zlim(z_mid - z_range/2, z_mid + z_range/2)

def set_aspect_equal_3d(ax):
    ranges = [ax.get_xlim(), ax.get_ylim(), ax.get_zlim()]
    spans = [r[1]-r[0] for r in ranges]
    centers = [(r[1]+r[0])/2 for r in ranges]
    max_span = max(spans)
    ax.set_xlim(centers[0] - max_span/2, centers[0] + max_span/2)
    ax.set_ylim(centers[1] - max_span/2, centers[1] + max_span/2)
    ax.set_zlim(centers[2] - max_span/2, centers[2] + max_span/2)

set_aspect_equal_3d(ax)
plt.show()

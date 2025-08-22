'''This script processes exoplanet data and star catalogs to compute Cartesian coordinates, magnitudes,
 and classifications of stars relative to a specified exoplanet. The data collected from Nasa's exoplanet
 database and Gaia star catalog was stored in the google drive.
 The output is returned in a CSV file.
 This was done in Google Colab.
'''
from google.colab import drive
drive.mount('/content/gdrive')

import pandas as pd
import numpy as np

DEG2RAD = np.pi / 180

def radec_to_cartesian(ra, dec, dist):
    ra_rad = ra * DEG2RAD
    dec_rad = dec * DEG2RAD
    x = dist * np.cos(dec_rad) * np.cos(ra_rad)
    y = dist * np.cos(dec_rad) * np.sin(ra_rad)
    z = dist * np.sin(dec_rad)
    return np.array([x, y, z])

def adjust_magnitude(m_earth, d_earth, d_new):
    return m_earth + 5 * np.log10(d_new / d_earth)

def classify_star(teff, radius):
    if pd.isna(teff) or pd.isna(radius):
        return "Unknown"
    if radius < 0.8 and teff < 5200:
        return "Red Dwarf"
    elif 0.8 <= radius <= 1.5 and 5200 <= teff <= 7500:
        return "Main Sequence"
    elif radius > 1.5 and teff < 6000:
        return "Giant"
    elif teff > 7500:
        return "Hot Star"
    else:
        return "Other"

exoplanets = pd.read_csv("gdrive/MyDrive/NasaHack/20_exoplanets.csv")

planet_name = input("Enter exoplanet name: ")

matching_planets = exoplanets[exoplanets['pl_name'] == planet_name]
if matching_planets.empty:
    raise ValueError(f"Exoplanet '{planet_name}' not found in dataset.")

planet_row = matching_planets.iloc[0]
planet_pos = radec_to_cartesian(planet_row['ra'], planet_row['dec'], planet_row['sy_dist'])

stars = pd.read_csv(f"gdrive/MyDrive/NasaHack/{planet_name}.csv")

xs, ys, zs, mags, dists = [], [], [], [], []

for _, star in stars.iterrows():
    star_dist = np.nan
    if not pd.isna(star.get('sy_dist')):
        star_dist = star['sy_dist']
    elif not pd.isna(star.get('parallax')) and star['parallax'] > 0:
        star_dist = 1000 / star['parallax']

    if not np.isnan(star_dist):
        star_pos = radec_to_cartesian(star['ra'], star['dec'], star_dist)
        d_new = np.linalg.norm(star_pos - planet_pos)

        mag = np.nan
        if not pd.isna(star.get('st_vmag')):
            mag = adjust_magnitude(star['st_vmag'], star_dist, d_new)
        elif not pd.isna(star.get('phot_g_mean_mag')):
            mag = adjust_magnitude(star['phot_g_mean_mag'], star_dist, d_new)

        xs.append(star_pos[0])
        ys.append(star_pos[1])
        zs.append(star_pos[2])
        mags.append(mag)
        dists.append(d_new)
    else:
        xs.append(np.nan)
        ys.append(np.nan)
        zs.append(np.nan)
        mags.append(np.nan)
        dists.append(np.nan)

stars['x'] = xs
stars['y'] = ys
stars['z'] = zs
stars['brightness'] = mags
stars['dist_from_planet'] = dists

stars['colour'] = stars.get('bp_rp', np.nan)
stars['stellar_radius'] = stars.get('radius', np.nan)
stars['temperature'] = stars.get('teff', np.nan)

stars['lifestage'] = stars.apply(
    lambda row: classify_star(row['temperature'], row['stellar_radius']), axis=1
)

output = stars[['source_id', 'x', 'y', 'z', 'brightness', 'colour',
                'dist_from_planet', 'stellar_radius', 'temperature', 'lifestage']]

output_file = f"gdrive/MyDrive/NasaHack/{planet_name}_stars_processed.csv"
output.to_csv(output_file, index=False)

print(f"Dataset saved as {output_file}")

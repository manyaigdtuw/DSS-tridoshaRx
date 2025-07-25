import pandas as pd
import psycopg2

def normalize(name):
    """Normalize disease/category names: lowercase, trim, collapse spaces."""
    if not isinstance(name, str):
        return ''
    return ' '.join(name.strip().lower().split())

conn = psycopg2.connect(
    dbname="namasteportal",
    user="postgres",
    password="admin123",
    host="localhost"
)
cur = conn.cursor()

df = pd.read_csv("finallist.csv")  

for idx, row in df.iterrows():
    
    cat_type_norm = normalize(row['type'])
    cur.execute("""
        INSERT INTO categorytype (type_name)
        VALUES (%s)
        ON CONFLICT (type_name) DO NOTHING
        RETURNING id
    """, (cat_type_norm,))
    val = cur.fetchone()
    if val:
        categorytype_id = val[0]
    else:
        cur.execute("SELECT id FROM categorytype WHERE type_name=%s", (cat_type_norm,))
        categorytype_id = cur.fetchone()[0]

    category_name_norm = normalize(row['alpha'])
    cur.execute("""
        INSERT INTO category (categorytype_id, category_name)
        VALUES (%s, %s)
        ON CONFLICT (categorytype_id, category_name) DO NOTHING
        RETURNING id
    """, (categorytype_id, category_name_norm))
    val = cur.fetchone()
    if val:
        category_id = val[0]
    else:
        cur.execute("""
            SELECT id FROM category
            WHERE categorytype_id=%s AND category_name=%s
        """, (categorytype_id, category_name_norm))
        category_id = cur.fetchone()[0]

    subcategory_id = None
    if pd.notna(row.get('beta')):
        subcategory_name_norm = normalize(row['beta'])
        cur.execute("""
            INSERT INTO subcategory (category_id, subcategory_name)
            VALUES (%s, %s)
            ON CONFLICT (category_id, subcategory_name) DO NOTHING
            RETURNING id
        """, (category_id, subcategory_name_norm))
        val = cur.fetchone()
        if val:
            subcategory_id = val[0]
        else:
            cur.execute("""
                SELECT id FROM subcategory
                WHERE category_id=%s AND subcategory_name=%s
            """, (category_id, subcategory_name_norm))
            subcategory_id = cur.fetchone()[0]

    tertiary_id = None
    if pd.notna(row.get('gamma')):
        tertiary_name_norm = normalize(row['gamma'])
        cur.execute("""
            INSERT INTO tertiarycategory (subcategory_id, tertiary_name)
            VALUES (%s, %s)
            ON CONFLICT (subcategory_id, tertiary_name) DO NOTHING
            RETURNING id
        """, (subcategory_id, tertiary_name_norm))
        val = cur.fetchone()
        if val:
            tertiary_id = val[0]
        else:
            cur.execute("""
                SELECT id FROM tertiarycategory
                WHERE subcategory_id=%s AND tertiary_name=%s
            """, (subcategory_id, tertiary_name_norm))
            tertiary_id = cur.fetchone()[0]

    disease_name_norm = normalize(row['disease'])
    cur.execute("SELECT disease_id FROM diseases WHERE name=%s", (disease_name_norm,))
    res = cur.fetchone()
    if res:
        disease_id = res[0]
    else:
        cur.execute("INSERT INTO diseases (name) VALUES (%s) RETURNING disease_id", (disease_name_norm,))
        disease_id = cur.fetchone()[0]

    cur.execute("""
        INSERT INTO diseasecategorymapping
        (disease_id, categorytype_id, category_id, subcategory_id, tertiary_id, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT DO NOTHING
    """, (
        disease_id,
        categorytype_id,
        category_id,
        subcategory_id,
        tertiary_id,
        row.get('created_at')
    ))

    print(f"Inserted mapping for disease: {row['disease']}")

# --- Finalize ---
conn.commit()
cur.close()
conn.close()
print("All rows processed.")

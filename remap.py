import pandas as pd


def remap_date_and_state(df):
    df['FL_DATE'] = pd.to_datetime(df['FL_DATE'], format='%m/%d/%y %H:%M')

    # Convert the date column to the desired format (YYYY-MM-DD)
    df['FL_DATE'] = df['FL_DATE'].dt.strftime('%Y-%m-%d')
    print("done remap time")

    state_mapping = {
        'AK': 'Alaska',
        'AL': 'Alabama',
        'AR': 'Arkansas',
        'AZ': 'Arizona',
        'CA': 'California',
        'CO': 'Colorado',
        'CT': 'Connecticut',
        'DE': 'Delaware',
        'FL': 'Florida',
        'GA': 'Georgia',
        'HI': 'Hawaii',
        'IA': 'Iowa',
        'ID': 'Idaho',
        'IL': 'Illinois',
        'IN': 'Indiana',
        'KS': 'Kansas',
        'KY': 'Kentucky',
        'LA': 'Louisiana',
        'MA': 'Massachusetts',
        'MD': 'Maryland',
        'ME': 'Maine',
        'MI': 'Michigan',
        'MN': 'Minnesota',
        'MO': 'Missouri',
        'MS': 'Mississippi',
        'MT': 'Montana',
        'NC': 'North Carolina',
        'ND': 'North Dakota',
        'NE': 'Nebraska',
        'NH': 'New Hampshire',
        'NJ': 'New Jersey',
        'NM': 'New Mexico',
        'NV': 'Nevada',
        'NY': 'New York',
        'OH': 'Ohio',
        'OK': 'Oklahoma',
        'OR': 'Oregon',
        'PA': 'Pennsylvania',
        'RI': 'Rhode Island',
        'SC': 'South Carolina',
        'SD': 'South Dakota',
        'TN': 'Tennessee',
        'TX': 'Texas',
        'UT': 'Utah',
        'VA': 'Virginia',
        'VT': 'Vermont',
        'WA': 'Washington',
        'WI': 'Wisconsin',
        'WV': 'West Virginia',
        'WY': 'Wyoming',
        'DC': 'District of Columbia'
    }
    df['ORIGIN_AIRPORT_ID'] = df['ORIGIN_AIRPORT_ID'].map(state_mapping)
    df['DEST_AIRPORT_ID'] = df['DEST_AIRPORT_ID'].map(state_mapping)

    print("done remap state")
    column_mapping = {
        'FL_DATE': 'week',
        'ORIGIN_AIRPORT_ID': 'origin_state',
        'DEST_AIRPORT_ID': 'dest_state',
        'count': 'count'
    }

    # Rename columns
    df = df.rename(columns=column_mapping)
    print("done rename column")
    return df

# Define a function to group flight dates into 7-day periods
def group_dates(date):
    days_to_shift = (date.dayofweek + 2) % 7
    return date - pd.to_timedelta(days_to_shift, unit='d')


def merge_to_week(df):
    df['week'] = pd.to_datetime(df['week'])

    # Group the DataFrame by 'origin_state', 'dest_state', and a 7-day period
    df['week'] = df['week'].apply(group_dates)
    result = df.groupby(['origin_state', 'dest_state', 'week'])[
        'count'].sum().reset_index()
    return result


filename = "./data/temp/combine.csv"
save_name = "./data/temp/flights_full.csv"
df = pd.read_csv(filename)
print("done reading file")
df = remap_date_and_state(df)
print("done remap date")
df = merge_to_week(df)
print("done merge into week")

# filtered_df = df[(df['week'] >= '2020-01-04') & (df['week'] <= '2023-09-16')]
filtered_df = df[(df['week'] >= '2019-10-04') & (df['week'] <= '2023-12-16')]
filtered_df = filtered_df[['week', 'origin_state', 'dest_state', 'count']]
filtered_df = filtered_df.sort_values(by='week')

# Save the filtered DataFrame to a CSV file
filtered_df.to_csv(save_name, index=False)

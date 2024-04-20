import pandas as pd

location = "./data/temp/"
main_df = pd.read_csv(f"{location}out0.csv")
print(len(main_df))
for i in range(1,1918):
    filename2 = f"{location}out{i}.csv"
    new_df = pd.read_csv(filename2)
    print(f"adding {filename2}")
    main_df = pd.concat([main_df, new_df], ignore_index=True, sort=False)


print(f"save merged data to {location}combine.csv")
main_df.to_csv(f"{location}combine.csv", index=False)
#open the csv


#for each row, check Value. if its a string, turn it into an int, if it's null, turn it into a string

import csv
import pandas as pd

newfile = []
i = -1


def toArr(string):
    retval = []
    col = 0
    i = 0
    j = -1
    for char in string:
        j += 1
        if(char == ','):
            retval.append(string[i:j])
            i = j+1
            col += 1
            if(col == 2):
                rest = string[j+1:]
                if(rest == "\n" or rest == ""):
                    retval.append("")
                else:
                    retval.append(int(string[j+1:].replace(",","").replace('\"',"")))
                return retval



firstRow = True
for row in open("COVID_data_full.csv"):
    i += 1
    
    if(i == 0):
        newfile.append(row)
        continue

    row = toArr(row)
    newRow = [row[0]]

    #add the state name, but ignore US totals,
        #and combine NYC/NY and MD/DC
    if(row[1] == "United States"):
        i -= 1
        continue
    elif(row[1] == "New York"):
        nyIndex = i
        newRow.append(row[1])
    elif(row[1] == "New York City"):
        if(newfile[nyIndex][2] != "No Data" and row[2] != ""):
            newfile[nyIndex][2] += row[2]
        i -= 1
        continue
    elif(row[1] == "District of Columbia"):
        mlIndex = i
        newRow.append("Maryland")
    elif(row[1] == "Maryland"):
        if(newfile[mlIndex][2] != "No Data" and row[2] != ""):
            newfile[mlIndex][2] += row[2]
        else:
            newfile[mlIndex][2] = row[2]
        i -= 1
        continue
    else:
        newRow.append(row[1])
    
    #add the number of deaths, but make sure it's an int
        #unless there's no data because the thing
        #hates strings, so for no data we'll give it strings.
    if(row[2] == ''):
        newRow.append("No Data")
    else:
        newRow.append(row[2])

    newfile.append(newRow)


#convert from arr to csv

output = ""

first = True
for row in newfile:
    if(first):
        output += row
        first = False
    else:
        output += row[0] + "," + row[1] + "," + str(row[2]) + "\n"

with open("COVID_data_final.csv", "w+") as f:
    f.write(output)
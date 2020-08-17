import pandas

def get_target_rank(df):

     a=df.groupby("target")["target"].count()/df.groupby("target")["target"].count().sum()
     dict(a)
     for i,j in dict(a).items():
        df.loc[df["target"]==i,"target_rank"]=j
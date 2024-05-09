import { supabase } from "@/supabase/client";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { v4 as uuidv4 } from 'uuid';

export default function Dashboard() {

    const [session, setSession] = useState(null);
    const router = useRouter();
    const [email, setEmail] = useState(session?.user.email || '');
    const [publicUserProfile, setPublicUserProfile] = useState(null);
    const [uuid, setUuid] = useState(null);

    async function keepLatestIdentity() {
        const {
            data,
        } = await supabase.auth.getUserIdentities();
        const identities = data?.identities || null;

        if (!identities) {
            return;
        }

        // 2024-05-08T17:42:51.245404Z to timestamp

        for (let i = 0; i < identities?.length; i++) {
            const identity = identities[i];
            const timestamp = new Date(identity.created_at).getTime();
            console.log(timestamp);
            console.log(new Date(timestamp).toISOString());
        }

        // sort identities by created_at
        identities.sort((a, b) => {
            return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        // old identities: keep a list all the previous identities except the latest one. if there is only one identity, then there is no old identity.
        const oldIdentities = identities.length > 1 ? identities.slice(0, -1) : [];
        console.log(identities, oldIdentities);

        // delete old identities
        for (let i = 0; i < oldIdentities.length; i++) {
            const identity = oldIdentities[i];
            await supabase.auth.unlinkIdentity(identity);
        }
    }

    async function upsertUser(session){
        const { data, error } = await supabase.from('users').upsert([
            {
                id: session.user.id,
                email: session.user.email,
                last_sign_in_at: session.user.last_sign_in_at
            }
        ]);
        console.log(data, error);
    }

    async function fetchPublicUserProfile(session) {
        const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id);
        console.log(data, error);
        if(data) {
            setPublicUserProfile(data[0]);
            setUuid(data[0].user_id);
        }
    }

    async function updateUuid(session){
        let uuid = uuidv4();
        setUuid(uuid);
        const { data, error } = await supabase.from('users').upsert([
            {
                id: session.user.id,
                user_id: uuid
            }
        ]);
        console.log(data, error);
        fetchPublicUserProfile(session);
    
    }

    useEffect(() => {
        const data = supabase.auth.onAuthStateChange((event, session) => {
            console.log(`Supabase Auth State Change: ${event}`);



            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            }
            else {
                if (session) {
                    console.log(session?.user);
                    setEmail(session?.user.email);
                    keepLatestIdentity();
                    upsertUser(session);
                    fetchPublicUserProfile(session);
                }
                setSession(session);
            }
        });

        return () => {
            data.data.subscription.unsubscribe();
        };
    }, []);



    return (
        <div className="flex flex-col gap-4 justify-center items-center h-screen w-[100%] bg-[#2b2b2b]">
            {session && <div className="absolute top-0 right-0 p-4 bg-[#3b3b3b] text-white">User: {session.user.email}</div>}
            {
                publicUserProfile && 
                <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px]">
                    <h1 className="text-white">Public Profile</h1>
                    <p>
                        User ID : {publicUserProfile.user_id}
                    </p>
                    <p>
                        Email: {publicUserProfile.email}
                    </p>
                    <p>
                        Last Sign In: {publicUserProfile.last_sign_in_at}
                    </p>
                    <p>
                        Created At: {publicUserProfile.joined_at}
                    </p>
                </div>
            }
            <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px]">
                <h1 className="text-white">Dashboard</h1>
                <p>
                    Update Email
                </p>
                <input type="email" onChange={(e) => setEmail(e.target.value)}
                    value={email}
                />
                <button onClick={async () => {
                    console.log('update email to ', email);
                    const { data, error } = await supabase.auth.updateUser({ email: email });
                    // log out
                    await supabase.auth.signOut();
                    console.log(data, error);
                }}>Update Email</button>
                <button onClick={() => supabase.auth.signOut()}>Sign Out</button>
            </div>

            {/* delete user */}
            <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px] mt-4">
                <h1 className="text-white">Delete Account</h1>
                <button onClick={async () => {
                    const { data, error } = await supabase.rpc('deleteUser');
                    // log out
                    await supabase.auth.signOut();
                    console.log(data, error);
                }}>Delete Account</button>
            </div>

            {/* update uuid */}
            <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px] mt-4">
                <h1 className="text-white">Update UUID</h1>
                <button onClick={() => updateUuid(session)}>Update UUID</button>
                <p>
                    UUID: {uuid}
                </p>
            </div>
        </div>
    );
}
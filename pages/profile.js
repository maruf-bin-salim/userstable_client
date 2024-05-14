import { supabase } from "@/supabase/client";
import { ArrowLeft, CircleDashed, DeleteIcon, Edit2Icon, KeyIcon, LogOutIcon, LucideDelete, MailCheck, Trash2Icon, User, UserCircle, UserMinus2Icon } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import styles from '@/styles/profile.module.css'

export default function Profile() {
    const [session, setSession] = useState(null);
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [publicUserProfile, setPublicUserProfile] = useState(null);
    const [uuid, setUuid] = useState(null);
    const [error, setError] = useState('');

    async function keepLatestIdentity() {
        const { data } = await supabase.auth.getUserIdentities();
        const identities = data?.identities || null;


        if (!identities) return;

        identities.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        const oldIdentities = identities.length > 1 ? identities.slice(0, -1) : [];
        oldIdentities.forEach(async identity => await supabase.auth.unlinkIdentity(identity));
    }

    async function upsertUser(session) {
        const { data, error } = await supabase.from('users').upsert([{
            id: session.user.id,
            email: session.user.email,
            last_sign_in_at: session.user.last_sign_in_at
        }]);
        if (error) console.error(error);
    }

    async function fetchPublicUserProfile(session) {
        const { data, error } = await supabase.from('users').select('*').eq('id', session.user.id);
        if (error) console.error(error);
        if (data && data.length > 0) {
            setPublicUserProfile(data[0]);
            setUuid(data[0].user_generated_id);
            return data[0];
        }
        else {
            return null;
        }
    }



    useEffect(() => {
        const data = supabase.auth.onAuthStateChange(async (event, session) => {
            if ((event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') && !session) {
                router.push('/');
            } else {
                if (session) {
                    setEmail(session?.user.email);
                    keepLatestIdentity();
                    upsertUser(session);
                    fetchPublicUserProfile(session);
                }
                setSession(session);
            }
        });

        return () => data.data.subscription.unsubscribe();
    }, []);


    useEffect(() => {

        let subscription = null;

        if (session) {
            subscription = supabase
                .channel('user_channel')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, payload => {
                    fetchPublicUserProfile(session).then(data => {
                        if (!data) {
                            supabase.auth.signOut().then(() => router.push('/'));
                        }
                    }
                    );
                })
                .subscribe()
        }


        return () => {
            if (subscription)
                supabase.removeChannel(subscription);
        };

    }
        , [session]);


    // 2024-05-09T17:49:46.184183Z
    function formatDate(date) {
        return new Date(date).toLocaleString();
    }

    if (!session) return null;


    if (!publicUserProfile) return (
        <div className={styles.loader}>
            <p className={styles.loading_text}>
                <CircleDashed size={64} />
            </p>
        </div>
    )

    return (
        <div className={styles.container}>
            <button onClick={() => router.push('/dashboard')} className={styles.back_button}>
                <ArrowLeft size={36} />
            </button>

            {publicUserProfile &&
                <div className={styles.card}>

                    <h1 className={styles.heading}>
                        {
                            publicUserProfile?.role.toLowerCase() + ' ' + 'Profile'
                        }
                        <UserCircle size={24} />
                    </h1>
                    <div className={styles.flex_profile}>
                        <div className={styles.flex}>
                            {session?.user?.user_metadata?.avatar_url && <img src={session.user.user_metadata.avatar_url} className={styles.avatar} />}
                            <p className={styles.card_text}>{publicUserProfile.email}</p>
                        </div>
                        <div className={styles.flex}>
                            <p className={styles.provider_text}>Logged in with {session?.user?.identities[0].provider}</p>
                            <button onClick={() => supabase.auth.signOut()} className={styles.logout_button}>
                                <LogOutIcon size={24} />
                            </button>
                        </div>
                    </div>

                    <p className={styles.card_text}>Your
                        ID: {publicUserProfile.user_generated_id}</p>
                    <p className={styles.card_text}>You joined at {formatDate(publicUserProfile.joined_at)}</p>
                    <p className={styles.card_text}>You last signed in at {formatDate(publicUserProfile.last_sign_in_at)}</p>

                </div>
            }

            <div className={styles.card}>
                <p className={styles.heading}>Update Email
                    <MailCheck size={24} />
                </p>

                <div className={styles.email_change}>

                    <input type="email" onChange={(e) => setEmail(e.target.value)} value={email}
                        spellCheck="false"
                        className={styles.email_input} />
                    {
                        email !== session?.user.email && email !== '' &&
                        <button onClick={async () => {

                            const { data, error } = await supabase.auth.updateUser({ email: email });
                            if (error) {
                                alert('Error updating email', error.message);
                            }
                            else {
                                alert(`Email Updation Started. Please click both ${email} and ${session.user.email} for verification email. Signing Out now.`);
                                await supabase.auth.signOut();
                            }
                        }} className={styles.email_button}>
                            Update Email
                            <Edit2Icon size={24} />
                        </button>
                    }
                    {
                        session && email !== session?.user.email &&
                        <button className={styles.cancel_email_button}
                            onClick={() => {
                                setEmail(session?.user.email);
                            }}
                        >
                            <LucideDelete size={24} />
                        </button>
                    }
                </div>



                {
                    email !== session?.user.email && email !== '' && (

                        <div className={styles.email_change_info}>
                            <p className={styles.email_change_info_text}>
                                {`After clicking, you will be signed out and you need to verify your email. `}
                            </p>
                            <p className={styles.email_change_info_text}>
                                {`You will be sent a verification email to both `}
                                <span className={styles.email_change_info_text_bold}>
                                    {email}
                                </span>
                                {` and `}
                                <span className={styles.email_change_info_text_bold}>
                                    {session?.user.email} .
                                </span>
                            </p>
                            <p className={styles.email_change_info_text}>{`Click both links to verify your email change request .`}</p>
                        </div>
                    )
                }

            </div>

            <div className={styles.card}>


                <h1 className={styles.heading}>
                    Update user ID
                    <KeyIcon size={24} />
                </h1>

                <div className={styles.uuid_change}>
                    <input type="text" value={uuid} onChange={(e) => {
                        setError('');
                        setUuid(e.target.value);
                    }}
                        onFocus={() => setError('')}
                        className={styles.user_id_input} />


                    <button onClick={async () => {


                        if (uuid === publicUserProfile.user_generated_id) {
                            setError('User ID is same as before');
                            return;
                        }

                        if (uuid === '') {
                            setError('User ID is empty');
                            return;
                        }

                        const { data, error } = await supabase.from('users').upsert([{
                            id: publicUserProfile.id,
                            user_generated_id: uuid
                        }]);

                        if (error) {
                            setError('user ID taken by someone else, please try another');
                        }
                        else {
                            await fetchPublicUserProfile(session);
                            setError('success');
                        }


                    }} className={styles.update_button}>
                        Update
                        <Edit2Icon size={24} />
                    </button>

                </div>
                {
                    error !== '' && error !== 'success' && <p className={styles.uuid_error_text}>{error}</p>
                }
                {
                    error === 'success' && <p className={styles.uuid_success_text}>User ID updated successfully</p>
                }

            </div>

            <div className={styles.card}>
                <h1 className={styles.heading}>
                    Delete Account
                    <UserMinus2Icon size={24} />
                </h1>
                <button onClick={async () => {
                    await supabase.from('users').delete().eq('id', session.user.id);
                    await supabase.rpc('deleteUser');
                    await supabase.auth.signOut();
                }} className={styles.delete_button}>
                    Delete Account
                    <Trash2Icon size={24} />
                </button>
            </div>

        </div>
    );
}
